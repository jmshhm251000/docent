import { useState, useMemo } from 'react';
import { Asset, Top, SearchField, GridList, Text, BottomCTA } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useNavigate } from 'react-router-dom';
import nasdaqStocks from '../assets/nasdaq_stocks.json';
import koreanStockData from '../assets/nasdaq_stocks_all_korean_names_v5_auto_cleanup.json';

const koreanNameMap: Record<string, string> = (koreanStockData as { symbol: string; name_ko: string }[]).reduce((acc, item) => {
  if (item.symbol && item.name_ko) {
    acc[item.symbol] = item.name_ko;
  }
  return acc;
}, {} as Record<string, string>);

interface Stock {
  symbol: string;
  name: string;
  krName?: string;
}

interface SelectedStock extends Stock {
  src: string;
}

export default function Search() {
  const [keyword, setKeyword] = useState('');
  const [selectedStocks, setSelectedStocks] = useState<SelectedStock[]>([]);
  const navigation = useNavigate();

  // Korean name mapping is now handled globally via koreanNameMap import

  // Enrich imported stocks with Korean names where available
  const stocks: Stock[] = useMemo(
    () =>
      (nasdaqStocks as Stock[]).map((s) => ({
        ...s,
        krName: koreanNameMap[s.symbol as keyof typeof koreanNameMap],
      })),
    []
  );

  // Default placeholder images
  const defaultImages = [
    'https://static.toss.im/icons/png/4x/icon-step1-gray-blue.png',
    'https://static.toss.im/icons/png/4x/icon-step2-gray-blue.png',
    'https://static.toss.im/icons/png/4x/icon-step3-gray-blue.png',
    'https://static.toss.im/icons/png/4x/icon-step4-gray-blue.png',
    'https://static.toss.im/icons/png/4x/icon-step5-gray-blue.png',
  ];

  // Calculate Levenshtein distance (edit distance)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return dp[m][n];
  };

  // Check if all characters in query exist in text (order-independent)
  const hasAllCharacters = (query: string, text: string): boolean => {
    const textChars = new Set(text.split(''));
    return query.split('').every(char => textChars.has(char));
  };

  // Calculate character frequency similarity
  const characterFrequencyScore = (query: string, text: string): number => {
    const queryFreq: Record<string, number> = {};
    const textFreq: Record<string, number> = {};

    for (const char of query) {
      queryFreq[char] = (queryFreq[char] || 0) + 1;
    }
    for (const char of text) {
      textFreq[char] = (textFreq[char] || 0) + 1;
    }

    let matchCount = 0;
    let totalQueryChars = 0;
    for (const char in queryFreq) {
      totalQueryChars += queryFreq[char];
      const queryCount = queryFreq[char];
      const textCount = textFreq[char] || 0;
      matchCount += Math.min(queryCount, textCount);
    }

    return totalQueryChars > 0 ? (matchCount / totalQueryChars) * 100 : 0;
  };

  // Check if query is a subsequence of text (characters in order but not necessarily consecutive)
  const isSubsequence = (query: string, text: string): boolean => {
    let queryIndex = 0;
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === query.length;
  };

  // Calculate similarity score between query and text
  const calculateSimilarity = (query: string, text: string): number => {
    if (!query || !text) return 0;

    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // Exact match
    if (lowerText === lowerQuery) return 100;

    // Starts with
    if (lowerText.startsWith(lowerQuery)) return 95;

    // Contains
    if (lowerText.includes(lowerQuery)) return 85;

    // Check if all characters exist (order-independent) - good for typos like "nyflix" -> "netflix"
    if (hasAllCharacters(lowerQuery, lowerText)) {
      // Calculate how close the order is
      const subsequenceScore = isSubsequence(lowerQuery, lowerText) ? 70 : 50;
      const freqScore = characterFrequencyScore(lowerQuery, lowerText);
      return Math.max(subsequenceScore, freqScore * 0.8);
    }

    // Levenshtein distance for typos
    const maxLen = Math.max(lowerQuery.length, lowerText.length);
    if (maxLen > 0) {
      const distance = levenshteinDistance(lowerQuery, lowerText);
      const similarity = (1 - distance / maxLen) * 100;

      // Only consider if similarity is reasonable (at least 50% similar)
      if (similarity >= 50) {
        return similarity * 0.7; // Weight it lower than exact matches
      }
    }

    // Subsequence matching (characters in order)
    if (isSubsequence(lowerQuery, lowerText)) {
      return 40;
    }

    // Character frequency matching
    const freqScore = characterFrequencyScore(lowerQuery, lowerText);
    if (freqScore > 60) {
      return freqScore * 0.5;
    }

    return 0;
  };

  // Fuzzy search function
  const fuzzySearch = (query: string, stocks: Stock[]): Stock[] => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query);
    const results: Array<{ stock: Stock; score: number }> = [];

    for (const stock of stocks) {
      const symbol = stock.symbol.toLowerCase();
      const name = stock.name.toLowerCase();
      const krName = (stock.krName || '').toLowerCase();

      // Calculate scores for symbol, English name, and Korean name
      const symbolScore = calculateSimilarity(lowerQuery, symbol);
      const nameScore = calculateSimilarity(lowerQuery, name);
      const krScore = krName ? calculateSimilarity(lowerQuery, krName) : 0;

      // If query is Korean, prioritize Korean name matches
      let score: number;
      if (hasKorean) {
        score = Math.max(krScore * 1.2, nameScore * 0.7, symbolScore * 0.5);
      } else {
        // If query is English / ticker, keep existing behavior but also consider Korean name slightly
        score = Math.max(symbolScore * 1.1, nameScore, krScore * 0.6);
      }

      if (score > 25) {
        results.push({ stock, score });
      }
    }

    // Sort by score descending and return top 10
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.stock);
  };

  // Get search results
  const searchResults = useMemo(() => {
    return fuzzySearch(keyword, stocks);
  }, [keyword]);

  // Handle adding a stock
  const handleAddStock = (stock: Stock) => {
    if (selectedStocks.length >= 5) {
      return; // Maximum 5 stocks
    }

    // Check if already selected
    if (selectedStocks.some(s => s.symbol === stock.symbol)) {
      return;
    }

    const newStock: SelectedStock = {
      ...stock,
      src: defaultImages[selectedStocks.length],
    };

    setSelectedStocks([...selectedStocks, newStock]);
    setKeyword(''); // Clear search after adding
  };

  // Handle removing a stock
  const handleRemoveStock = (symbol: string) => {
    setSelectedStocks(selectedStocks.filter(s => s.symbol !== symbol));
  };

  // Highlight matching characters in text
  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) {
      return <>{text}</>;
    }

    const lowerQuery = query.toLowerCase();
    const queryChars = new Set(lowerQuery.split(''));

    // Split text into characters and highlight matching ones
    return (
      <>
        {text.split('').map((char, idx) => {
          const isMatch = queryChars.has(char.toLowerCase());
          return (
            <span key={idx} style={{ color: isMatch ? adaptive.blue500 : 'inherit' }}>
              {char}
            </span>
          );
        })}
      </>
    );
  };

  // Build items3 and items2 from selected stocks
  const items3 = useMemo(() => {
    const selected = selectedStocks.slice(0, 3);
    const remaining = 3 - selected.length;
    return [
      ...selected,
      ...Array(remaining).fill(null).map((_, i) => ({
        label: '미국주식',
        src: defaultImages[selected.length + i],
      })),
    ];
  }, [selectedStocks]);

  const items2 = useMemo(() => {
    const selected = selectedStocks.slice(3, 5);
    const remaining = 2 - selected.length;
    return [
      ...selected,
      ...Array(remaining).fill(null).map((_, i) => ({
        label: '미국주식',
        src: defaultImages[3 + selected.length + i],
      })),
    ];
  }, [selectedStocks]);

  const handlePress = () => {
    navigation('/report', { state: { selectedStocks: selectedStocks.map(s => s.symbol) } });
  };

  return (
    <>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            미국주식 5개를 선택할 수 있어요
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph>
            선택한 종목을 S&P 500 지수와 함께 확인할 수 있어요.
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ height: 12 }} />

      <div style={{ position: 'relative' }}>
        <SearchField
          placeholder="검색 / 직접 입력"
          value={keyword}
          onChange={(e) => setKeyword((e.target as HTMLInputElement).value)}
          autoFocus={false}
          disabled={false}
        />

        {/* Search Results Dropdown */}
        {keyword.trim() && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: `1px solid ${adaptive.grey200}`,
              borderRadius: '8px',
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            {searchResults.map((stock) => (
              <div
                key={stock.symbol}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${adaptive.grey100}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => handleAddStock(stock)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = adaptive.grey50;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '16px', lineHeight: '1.4' }}>
                    {highlightMatches(stock.symbol, keyword)}
                  </div>
                  <div style={{ fontSize: '14px', color: adaptive.grey600, marginTop: '4px', lineHeight: '1.4' }}>
                    {highlightMatches(
                      /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(keyword) && stock.krName ? stock.krName : stock.name,
                      keyword
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddStock(stock);
                  }}
                  disabled={selectedStocks.length >= 5 || selectedStocks.some(s => s.symbol === stock.symbol)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: selectedStocks.length >= 5 || selectedStocks.some(s => s.symbol === stock.symbol)
                      ? adaptive.grey300
                      : adaptive.blue500,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: selectedStocks.length >= 5 || selectedStocks.some(s => s.symbol === stock.symbol)
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: selectedStocks.length >= 5 || selectedStocks.some(s => s.symbol === stock.symbol) ? 0.5 : 1,
                  }}
                >
                  추가
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />

      <GridList column={3}>
        {items3.map((it, i) => {
          const isSelected = 'symbol' in it;
          return (
            <div key={isSelected ? it.symbol : i} style={{ position: 'relative' }}>
              <GridList.Item
                image={
                  <Asset.Image
                    frameShape={Asset.frameShape.CleanW24}
                    src={it.src}
                    aria-hidden
                  />
                }
              >
                {isSelected ? (
                  <Text typography="t7" color={adaptive.grey900} style={{ fontWeight: 600 }}>
                    {it.symbol}
                  </Text>
                ) : (
                  <Text typography="t7" color={adaptive.grey900}>{it.label}</Text>
                )}
              </GridList.Item>
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: adaptive.red500,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    cursor: 'pointer',
                    zIndex: 10,
                    padding: '4px',
                    minWidth: '28px',
                    minHeight: '28px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveStock(it.symbol);
                  }}
                >
                  ×
                </div>
              )}
            </div>
          );
        })}
      </GridList>
      <GridList column={2}>
        {items2.map((it, i) => {
          const isSelected = 'symbol' in it;
          return (
            <div key={isSelected ? it.symbol : i + 3} style={{ position: 'relative' }}>
              <GridList.Item
                image={
                  <Asset.Image
                    frameShape={Asset.frameShape.CleanW24}
                    src={it.src}
                    aria-hidden
                  />
                }
              >
                {isSelected ? (
                  <Text typography="t7" color={adaptive.grey900} style={{ fontWeight: 600 }}>
                    {it.symbol}
                  </Text>
                ) : (
                  <Text typography="t7" color={adaptive.grey900}>{it.label}</Text>
                )}
              </GridList.Item>
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: adaptive.red500,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    cursor: 'pointer',
                    zIndex: 10,
                    padding: '4px',
                    minWidth: '28px',
                    minHeight: '28px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveStock(it.symbol);
                  }}
                >
                  ×
                </div>
              )}
            </div>
          );
        })}
      </GridList>

      <div style={{ height: 12 }} />

      {selectedStocks.length === 0 && (
        <div style={{
          padding: '0 16px 8px',
          textAlign: 'center',
        }}>
          <Text typography="t7" color={adaptive.grey500} style={{ fontSize: '13px' }}>
            주식을 최소 1개 이상 선택해야 해요
          </Text>
        </div>
      )}

      <BottomCTA
        fixed
        loading={false}
        {...({
          onClick: selectedStocks.length > 0 ? handlePress : undefined,
          style: selectedStocks.length === 0 ? {
            backgroundColor: adaptive.grey300,
            color: adaptive.grey500,
            pointerEvents: 'none' as const,
            cursor: 'not-allowed',
          } : undefined
        } as any)}
      >
        분석하기
      </BottomCTA>
    </>
  );
}
