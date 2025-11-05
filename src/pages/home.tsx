import {Asset, Top, StepperRow, BottomCTA} from '@toss/tds-mobile' // ⬅️ Spacing 제거

export default function App() {
  return (
    <>

      <Top
        title={
          <Top.TitleParagraph size={22} color="#191F28">
            미국주식 포트폴리오를 분석할수 있어요.
          </Top.TitleParagraph>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Asset.Image
          frameShape={{ width: 220 }}
          src="https://static.toss.im/3d/tossmobile-kv-mobile-pay-hero.png"
          aria-hidden
        />
      </div>

      <div style={{ height: 12 }} />

      <StepperRow
        left={<StepperRow.NumberIcon number={1} />}
        center={<StepperRow.Texts type="A" title="티커 3개를 선택하세요" description="" />}
      />
      <StepperRow
        left={<StepperRow.NumberIcon number={2} />}
        center={<StepperRow.Texts type="A" title="비교하기를 눌러 리포트 생성" description="" />}
      />
      <StepperRow
        left={<StepperRow.NumberIcon number={3} />}
        center={<StepperRow.Texts type="A" title="하루 1회 무료, 추가는 광고 보기" description="" />}
        hideLine
      />

      <BottomCTA fixed loading={false}>다음</BottomCTA>
    </>
  )
}
