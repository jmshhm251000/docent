import { Asset, Top, StepperRow, BottomCTA } from '@toss/tds-mobile'
import emoji from '../assets/homeemoji.png'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigation = useNavigate();

  const handlePress = () => {
    navigation('/search');
  };

  return (
    <>
      <Top
        title={
          <Top.TitleParagraph size={22} color="#191F28">
            내 포트폴리오 리포트 만들어요
          </Top.TitleParagraph>
        }
      />

      <div style={{ height: 12 }} />

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Asset.Image
          frameShape={{ width: 220 }}
          src={emoji}
          aria-hidden
        />
      </div>

      <div style={{ height: 24 }} />

      <StepperRow
        left={<StepperRow.NumberIcon number={1} />}
        center={
          <StepperRow.Texts
            type="A"
            title="티커를 최대 5개까지 선택해요"
            description=""
          />
        }
      />
      <StepperRow
        left={<StepperRow.NumberIcon number={2} />}
        center={
          <StepperRow.Texts
            type="A"
            title="분석하기를 눌러 리포트를 만들어요"
            description=""
          />
        }
      />
      <StepperRow
        left={<StepperRow.NumberIcon number={3} />}
        center={
          <StepperRow.Texts
            type="A"
            title="매일 개인주식은 3회 포트폴리오는 1회, 추가는 광고 보기"
            description=""
          />
        }
        hideLine
      />

      <BottomCTA fixed loading={false} onClick={handlePress}>
        시작하기
      </BottomCTA>
    </>
  );
}