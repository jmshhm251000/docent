import { useEffect, useState } from 'react';
import { Top, Text, Asset } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Report() {
  const [isLoading, setIsLoading] = useState(true);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const primaryColor = '#3182F6';
  const grayColor = '#8B95A1';

  // In production, this will be controlled by API loading state.
  // For now, we simulate a short loading animation before showing the report.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Simplified data arrays - in production, load from API or props
  // Using sample data that matches the pattern from HTML
  const fullCumLabels = Array.from({ length: 400 }, (_, i) => {
    const date = new Date('2017-11-29');
    date.setDate(date.getDate() + i * 7);
    return date.toISOString().split('T')[0];
  });
  const fullCumPort = Array.from({ length: 400 }, (_, i) => 0.96 + i * 0.006);
  const fullCumBench = Array.from({ length: 400 }, (_, i) => 0.99 + i * 0.005);

  const rollLabels = Array.from({ length: 200 }, (_, i) => {
    const date = new Date('2018-03-01');
    date.setDate(date.getDate() + i * 10);
    return date.toISOString().split('T')[0];
  });
  const rollPort = Array.from({ length: 200 }, (_, i) => 0.15 + Math.sin(i / 10) * 0.1 + i * 0.0005);
  const rollBench = Array.from({ length: 200 }, (_, i) => 0.12 + Math.sin(i / 10) * 0.08 + i * 0.0004);

  const cumulativeChartData = {
    labels: fullCumLabels,
    datasets: [
      {
        label: '포트폴리오',
        data: fullCumPort,
        borderColor: primaryColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
      },
      {
        label: 'SPY',
        data: fullCumBench,
        borderColor: grayColor,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 3],
        tension: 0.2,
        pointRadius: 0,
      },
    ],
  };

  const volatilityChartData = {
    labels: rollLabels,
    datasets: [
      {
        label: '포트폴리오',
        data: rollPort,
        borderColor: primaryColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
      },
      {
        label: 'SPY',
        data: rollBench,
        borderColor: grayColor,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 3],
        tension: 0.2,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.0,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${(value * 100).toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        ticks: {
          callback: (value: any) => `${(value * 100).toFixed(0)}%`,
        },
        grid: {
          color: 'rgba(148,163,184,0.2)',
        },
      },
    },
  };

  // Heatmap data
  const heatmapData = [
    { year: '2017', months: Array(12).fill(null).map((_, i) => i < 10 ? null : i === 10 ? -1.5 : 0.9) },
    { year: '2018', months: [10.4, 1.6, -1.5, 4.0, 4.9, 2.4, 2.1, 8.2, 2.7, -9.6, 2.4, -6.5] },
    { year: '2019', months: [7.2, 8.2, 5.1, 6.7, -1.4, 6.4, 2.8, 2.5, -4.2, 3.0, 4.5, 2.0] },
    { year: '2020', months: [5.9, -8.3, -14.0, 12.5, 9.4, -1.4, 1.5, 13.8, -5.6, -11.9, 16.3, 5.0] },
    { year: '2021', months: [-11.4, 11.0, 0.2, 8.9, -4.1, 2.1, 5.6, -8.6, -1.2, -4.1, -7.2, 13.0] },
    { year: '2022', months: [6.0, -5.4, 0.8, -1.1, -0.9, -9.5, 10.0, -7.2, -11.5, 16.1, 6.8, -3.3] },
    { year: '2023', months: [8.8, -4.2, 2.4, 4.0, -4.4, 7.6, 0.3, 4.1, -5.2, -1.3, 9.7, 2.2] },
    { year: '2024', months: [5.2, 4.7, 0.1, -5.0, 0.4, -2.5, 3.2, 4.2, 0.8, 3.4, 7.8, -0.4] },
    { year: '2025', months: [6.9, 5.0, -4.1, -0.6, 6.4, -3.4, -0.9, 3.5, -3.7, -1.5, 0.7, null] },
  ];

  const getHeatmapColor = (value: number | null) => {
    if (value === null) return '#F9FAFB';
    if (value >= 10) return '#3182F6';
    if (value >= 8) return '#3B88F6';
    if (value >= 6) return '#458EF7';
    if (value >= 4) return '#5095F7';
    if (value >= 2) return '#64A1F8';
    if (value >= 0.5) return '#6CA6F8';
    if (value >= 0) return '#72AAF9';
    if (value >= -1) return '#CAE1FD';
    if (value >= -2) return '#FACDCF';
    if (value >= -5) return '#F7A1A7';
    if (value >= -8) return '#F58A91';
    if (value >= -10) return '#F3707B';
    return '#F04452';
  };

  // Metric explanations with safer wording
  const metricExplanations: Record<
    string,
    { meaning: string; warrenBuffett: string; explanation: string }
  > = {
    cagr: {
      meaning:
        'CAGR은 연평균 복리 수익률이에요. 일정 기간 동안 자산이 매년 평균적으로 얼마나 변했는지 정리해 보여줘요.',
      warrenBuffett:
        '워렌 버핏이 운영한 포트폴리오는 장기간 약 20%의 CAGR을 기록한 사례로 알려져 있어요. 이는 과거의 역사적 데이터일 뿐, 동일한 성과를 보장하거나 추천하는 의미는 아니에요.',
      explanation:
        'CAGR 값이 클수록 해당 기간 동안 자산이 더 빠르게 증가했다는 것을 의미해요. 다만, 여기에서 보여주는 수치는 모두 과거 데이터를 정리한 것이고, 미래 수익률이나 투자 결과를 보장하지 않아요.',
    },
    mdd: {
      meaning:
        'Max Drawdown은 투자 기간 중 최고점 대비 얼마나 많이 하락했는지를 보여주는 지표예요.',
      warrenBuffett:
        '워렌 버핏의 포트폴리오도 장기간 운용 과정에서 약 -50% 수준의 최대 낙폭을 경험한 적이 있는 것으로 알려져 있어요. 이는 과거 사례에 대한 설명일 뿐, 특정 전략을 권유하는 정보는 아니에요.',
      explanation:
        '값이 작을수록(0에 가까울수록) 해당 기간 동안 가격 하락 폭이 상대적으로 적었다는 뜻이에요. 이 지표 역시 위험을 이해하기 위한 참고용 정보이며, 단독으로 투자 의사결정을 내리기 위한 기준으로 쓰이면 안 돼요.',
    },
    sharpe: {
      meaning:
        '샤프비율은 변동성(위험)에 비해 어느 정도의 초과 수익을 냈는지 정리하는 지표예요.',
      warrenBuffett:
        '워렌 버핏 포트폴리오의 장기 샤프비율이 약 0.8 수준이었다는 분석들이 있어요. 이는 과거 데이터를 해석한 결과이며, 특정 수익률이나 전략을 보장하지 않아요.',
      explanation:
        '샤프비율이 높을수록 같은 변동성에서 더 높은 초과 수익을 기록했다는 뜻이에요. 다만, 계산 방식과 기간에 따라 값은 달라질 수 있고, 다른 지표들과 함께 참고용으로만 보는 것이 좋아요.',
    },
    volatility: {
      meaning:
        '변동성은 가격이 일정 기간 동안 얼마나 크게 움직였는지를 연간 기준으로 환산해 보여주는 지표예요.',
      warrenBuffett:
        '워렌 버핏 포트폴리오는 장기간 약 20% 수준의 변동성을 보였다는 분석이 있어요. 이 역시 과거 관측값을 정리한 것이고, 향후 투자 결과를 보장하거나 권유하는 의미는 아니에요.',
      explanation:
        '변동성이 높을수록 가격의 움직임이 컸다는 것을 의미해요. 다만, 높은 변동성이 반드시 나쁜 것도, 낮은 변동성이 반드시 좋은 것도 아니고, 투자 성격이나 목표에 따라 다르게 해석될 수 있어요.',
    },
  };

  const MetricCard = ({
    id,
    title,
    chip,
    portfolioValue,
    spyValue,
    percentage,
    description,
  }: any) => {
    const isFlipped = flippedCard === id;
    const explanation = metricExplanations[id as keyof typeof metricExplanations];

    return (
      <div
        style={{
          perspective: '1000px',
          marginBottom: isFlipped ? '200px' : '10px',
          transition: 'margin-bottom 0.6s',
          zIndex: isFlipped ? 10 : 1,
          position: 'relative',
        }}
        onClick={() => setFlippedCard(isFlipped ? null : id)}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: isFlipped ? '200px' : '140px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s, min-height 0.6s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: 'pointer',
          }}
        >
          {/* Front of card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px 14px 12px',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
              border: '1px solid #E5E8EB',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <Text
                typography="t6"
                color={adaptive.grey700}
                style={{ fontWeight: 600, fontSize: '13px' }}
              >
                {title}
              </Text>
              <div
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid #D1D6DB',
                  color: '#6B7684',
                  background: '#F9FAFB',
                }}
              >
                {chip}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#8B95A1', marginBottom: '2px' }}>
                  포트폴리오
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: adaptive.grey900,
                  }}
                >
                  {portfolioValue}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#8B95A1', marginBottom: '2px' }}>
                  SPY
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: adaptive.grey900,
                  }}
                >
                  {spyValue}
                </div>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                marginTop: '6px',
                height: '10px',
                borderRadius: '999px',
                background: 'rgba(15, 23, 42, 0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  bottom: '2px',
                  left: '50%',
                  width: '1px',
                  background: 'rgba(148, 163, 184, 0.25)',
                  transform: 'translateX(-0.5px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '1px',
                  bottom: '1px',
                  left: 0,
                  width: `${percentage}%`,
                  borderRadius: '999px',
                  background: 'rgba(49, 130, 246, 0.18)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '1px',
                  bottom: '1px',
                  left: `${percentage}%`,
                  width: '2px',
                  borderRadius: '999px',
                  background: 'rgba(49, 130, 246, 0.65)',
                }}
              />
            </div>

            <div style={{ marginTop: '6px' }}>
              <Text
                typography="t7"
                color={adaptive.grey600}
                style={{ fontSize: '12px', lineHeight: 1.4 }}
              >
                {description}
              </Text>
            </div>
          </div>

          {/* Back of card */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              minHeight: '200px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px 14px 12px',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
              border: '1px solid #E5E8EB',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <Text
                  typography="t6"
                  color={adaptive.grey700}
                  style={{ fontWeight: 600, fontSize: '13px' }}
                >
                  {title}
                </Text>
                <div
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #D1D6DB',
                    color: '#6B7684',
                    background: '#F9FAFB',
                  }}
                >
                  {chip}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <Text
                  typography="t7"
                  color={adaptive.grey900}
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.6,
                    fontWeight: 500,
                    marginBottom: '8px',
                  }}
                >
                  {explanation.meaning}
                </Text>
              </div>

              <div
                style={{
                  background: '#F4F6FA',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '12px',
                }}
              >
                <Text
                  typography="t7"
                  color={adaptive.grey700}
                  style={{ fontSize: '12px', lineHeight: 1.6 }}
                >
                  <span style={{ fontWeight: 600, color: adaptive.grey900 }}>
                    워렌 버핏의 포트폴리오
                  </span>
                  <br />
                  {explanation.warrenBuffett}
                </Text>
              </div>

              <div>
                <Text
                  typography="t7"
                  color={adaptive.grey600}
                  style={{ fontSize: '12px', lineHeight: 1.6 }}
                >
                  {explanation.explanation}
                </Text>
              </div>
            </div>

            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <Text typography="t7" color={adaptive.grey500} style={{ fontSize: '11px' }}>
                다시 클릭하면 앞면으로 돌아가요
              </Text>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <Top
          title={
            <Top.TitleParagraph size={22} color={adaptive.grey900}>
              지난 10년의 주가 데이터를 불러오고 있어요
            </Top.TitleParagraph>
          }
          subtitleBottom={
            <Top.SubtitleParagraph color={adaptive.grey500}>
              잠시만 기다려주세요.
            </Top.SubtitleParagraph>
          }
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <Asset.Lottie
            frameShape={{ width: 375 }}
            src="https://static.toss.im/lotties/loading/load-ripple.json"
            loop={true}
            speed={1}
            aria-hidden={true}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            포트폴리오 리포트를 가져왔어요
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <>
            <Top.SubtitleParagraph>
              선택한 포트폴리오와 SPY를 같은 기간의 과거 데이터로 정리해 보여줘요.
            </Top.SubtitleParagraph>
            <div style={{ marginTop: '4px' }}>
              <Text
                typography="t7"
                color={adaptive.grey500}
                style={{ fontSize: '11px', lineHeight: 1.5 }}
              >
                2017-11-29 ~ 2025-11-12 기준의 과거 주가 데이터를 바탕으로 작성된 정보용 리포트예요.
                미래 수익률이나 투자 결과를 보장하지 않아요.
              </Text>
            </div>
          </>
        }
      />

      <div style={{ height: 12 }} />

      <div style={{ paddingLeft: '16px', paddingRight: '16px' }}>
        {/* 핵심 지표 섹션 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text
              typography="t6"
              color={adaptive.grey900}
              style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}
            >
              핵심 지표를 먼저 볼게요
            </Text>
            <Text
              typography="t7"
              color={adaptive.grey500}
              style={{ fontSize: '12px', marginBottom: '4px' }}
            >
              이 포트폴리오의 성과와 위험을 한눈에 볼 수 있는 지표들을 모아두었어요.
              각 카드를 눌러서 지표의 의미와 해석 방법을 자세히 확인할 수 있어요.
            </Text>
            <Text
              typography="t7"
              color={adaptive.grey500}
              style={{ fontSize: '11px', lineHeight: 1.5, marginBottom: '12px' }}
            >
              아래에 나오는 값들은 모두 과거 데이터를 정리한 정보일 뿐, 투자 자문이나
              특정 상품 권유를 위한 내용이 아니에요.
            </Text>
          </div>

          <MetricCard
            id="cagr"
            title="CAGR · 연평균 수익률"
            chip="성장"
            portfolioValue="17.2%"
            spyValue="14.6%"
            percentage={60}
            description="8.0년 동안 연평균 17.2%의 수익률을 기록했어요. 같은 기간 시장(SPY)의 연평균 수익률은 14.6%였어요."
          />

          <MetricCard
            id="mdd"
            title="Max Drawdown · 최대 낙폭"
            chip="리스크"
            portfolioValue="-38.7%"
            spyValue="-33.8%"
            percentage={40}
            description="투자 기간 동안 최고점 대비 최대 38.7%까지 하락한 구간이 있었어요. 같은 기간 시장(SPY)의 최대 낙폭은 -33.8%였어요."
          />

          <MetricCard
            id="sharpe"
            title="Sharpe Ratio · 샤프비율"
            chip="위험 대비 수익"
            portfolioValue="0.73"
            spyValue="0.80"
            percentage={43}
            description="위험 대비 초과 수익을 나타내는 샤프비율이 0.73으로 계산되었어요. 같은 기간 시장(SPY)의 샤프비율은 0.80이에요."
          />

          <MetricCard
            id="volatility"
            title="Volatility · 변동성"
            chip="움직임"
            portfolioValue="26.7%"
            spyValue="19.5%"
            percentage={38}
            description="연간 기준 변동성이 26.7%로 측정되었어요. 같은 기간 시장(SPY)의 변동성은 19.5% 수준이었어요."
          />
        </div>

        {/* 누적 수익률 차트 */}
        <div style={{ marginBottom: '20px' }}>
          <Text
            typography="t6"
            color={adaptive.grey900}
            style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}
          >
            누적 수익률을 볼게요
          </Text>
          <Text
            typography="t7"
            color={adaptive.grey500}
            style={{ fontSize: '12px', marginBottom: '10px' }}
          >
            같은 기간 동안 포트폴리오와 시장(SPY)의 누적 수익률이 어떻게 달라졌는지
            시각적으로 보여줘요. 과거 흐름을 이해하기 위한 참고용 정보예요.
          </Text>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '10px 10px 14px',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
              border: '1px solid #E5E8EB',
              marginTop: '6px',
            }}
          >
            <div style={{ height: '200px' }}>
              <Line data={cumulativeChartData} options={chartOptions} />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                fontSize: '11px',
                marginTop: '4px',
                color: '#8B95A1',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: primaryColor,
                    marginRight: '4px',
                  }}
                />
                포트폴리오
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: grayColor,
                    marginRight: '4px',
                  }}
                />
                SPY
              </div>
            </div>
          </div>
        </div>

        {/* 월별 수익률 히트맵 */}
        <div style={{ marginBottom: '20px' }}>
          <Text
            typography="t6"
            color={adaptive.grey900}
            style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}
          >
            월별 수익률 히트맵이에요
          </Text>
          <Text
            typography="t7"
            color={adaptive.grey500}
            style={{ fontSize: '12px', marginBottom: '10px' }}
          >
            각 연도·월별 수익률을 색으로 표현했어요. 파란색일수록 플러스 수익, 빨간색일수록
            마이너스 수익을 나타내요. 특정 시기에 수익과 손실이 어떻게 분포했는지 한눈에
            확인할 수 있어요.
          </Text>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '10px 10px 14px',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
              border: '1px solid #E5E8EB',
              marginTop: '6px',
            }}
          >
            <div style={{ overflowX: 'auto', marginTop: '6px' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  minWidth: '340px',
                  fontSize: '11px',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        paddingRight: '6px',
                        color: '#6B7684',
                        fontSize: '10px',
                        padding: '4px',
                      }}
                    />
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                      <th
                        key={month}
                        style={{
                          fontWeight: 500,
                          color: '#8B95A1',
                          fontSize: '10px',
                          padding: '4px',
                          textAlign: 'center',
                        }}
                      >
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row) => (
                    <tr key={row.year}>
                      <th
                        style={{
                          textAlign: 'left',
                          paddingRight: '6px',
                          color: '#6B7684',
                          padding: '4px',
                        }}
                      >
                        {row.year}
                      </th>
                      {row.months.map((value, idx) => (
                        <td
                          key={idx}
                          style={{
                            background: getHeatmapColor(value),
                            padding: '4px',
                            textAlign: 'center',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: '40px',
                              color: '#111827',
                            }}
                          >
                            {value !== null
                              ? `${value > 0 ? '+' : ''}${value}%`
                              : ''}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 롤링 변동성 차트 */}
        <div style={{ marginBottom: '20px' }}>
          <Text
            typography="t6"
            color={adaptive.grey900}
            style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}
          >
            3개월 기준 변동성을 볼게요
          </Text>
          <Text
            typography="t7"
            color={adaptive.grey500}
            style={{ fontSize: '12px', marginBottom: '10px' }}
          >
            63거래일(약 3개월)을 기준으로 연간 변동성을 계산해서 포트폴리오와 SPY를 함께
            보여줘요. 어느 시기에 가격 움직임이 컸는지 확인하는 데 도움이 되는 참고용
            차트예요.
          </Text>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '10px 10px 14px',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
              border: '1px solid #E5E8EB',
              marginTop: '6px',
            }}
          >
            <div style={{ height: '200px' }}>
              <Line data={volatilityChartData} options={chartOptions} />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                fontSize: '11px',
                marginTop: '4px',
                color: '#8B95A1',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: primaryColor,
                    marginRight: '4px',
                  }}
                />
                포트폴리오
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: grayColor,
                    marginRight: '4px',
                  }}
                />
                SPY
              </div>
            </div>
          </div>
        </div>

        {/* 글로벌 면책 문구 */}
        <div style={{ marginBottom: '32px' }}>
          <Text
            typography="t7"
            color={adaptive.grey500}
            style={{ fontSize: '11px', lineHeight: 1.6 }}
          >
            본 리포트는 과거 데이터를 바탕으로 정보를 정리해 보여주는 화면이에요. 투자
            자문, 투자 권유, 금융상품 추천을 제공하지 않으며, 여기에서 제시된 모든 수치는
            미래의 수익률이나 손실을 보장하지 않아요. 최종 투자 결정과 책임은 언제나
            투자자 본인에게 있습니다.
          </Text>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </>
  );
}
