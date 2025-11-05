import { useState } from 'react';
import { Asset, Top, SearchField, GridList, Text } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';

export default function Page() {
  const [keyword, setKeyword] = useState('');

  const items = [
    { label: '텍스트', src: 'https://static.toss.im/icons/png/4x/icon-step1-gray-blue.png' },
    { label: '텍스트', src: 'https://static.toss.im/icons/png/4x/icon-step2-gray-blue.png' },
    { label: '텍스트', src: 'https://static.toss.im/icons/png/4x/icon-step3-gray-blue.png' },
  ];

  return (
    <>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            미국주식 3개를 고를 수 있어요
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph>
            선택 후 지수종목과 비교분석 할수 있어요!
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ height: 12 }} />

      {/* SearchField */}
      <SearchField
        placeholder="검색 / 직접 입력"
        value={keyword}
        onChange={(e) => setKeyword((e.target as HTMLInputElement).value)}
        autoFocus={false}
        disabled={false}
      />

      <div style={{ height: 12 }} />

      {/* GridList: column, image prop 사용 */}
      <GridList column={3}>
        {items.map((it, i) => (
          <GridList.Item
            key={i}
            image={
              <Asset.Image
                frameShape={Asset.frameShape.CleanW24}
                src={it.src}
                aria-hidden
              />
            }
          >
            <Text typography="t7" color={adaptive.grey900}>{it.label}</Text>
          </GridList.Item>
        ))}
      </GridList>

      {/* (원래 있던 이미지가 필요하면 유지) */}
      <div style={{ height: 12 }} />
      <Asset.Image
        frameShape={Asset.frameShape.CleanW16}
        src="https://static.toss.im/appsintoss/5693/694d760f-6467-4dad-92b1-a4d760a74c13.png"
        aria-hidden
      />
    </>
  );
}
