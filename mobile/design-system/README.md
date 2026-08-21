# Harulog 디자인 시스템

앱과 분리 가능한 컴포넌트 라이브러리. Storybook으로 개발·검증한다.

```
design-system/
├── components/     # Card, Section, ...
├── tokens/         # 앱 constants/colors.ts로 가는 유일한 통로
└── index.ts        # 통합 export
```

## 규칙

- `components/`는 앱 코드(`constants/`, `store/`)를 직접 import 하지 않는다. 반드시 `tokens/`를 거친다. 나중에 패키지로 분리할 때 `tokens/index.ts`만 교체하면 된다.
- 색 값을 복제하지 않는다. `constants/colors.ts`가 단일 진실 소스다. hex 하드코딩 금지.
- 컴포넌트끼리 import 하지 않는다. 조합은 사용처가 한다(예: `Section.Content` 안에 `Card`).
- `any` 금지. `style`은 `StyleProp<ViewStyle>`.
- 색 없는 정적 수치는 `StyleSheet.create`, 테마 의존 색은 인라인 병합. 앱의 지배적 관례가 인라인이기 때문이다(컴포넌트 44개 중 `StyleSheet.create`는 1개).

## 새 컴포넌트를 만들기 전에

**기존 화면에서 실제로 쓰이는 패턴을 먼저 수집한다.** 일반적인 컴포넌트 관습이 이 앱에서는 성립하지 않는 경우가 있다.

- `Card`의 `elevated` / `outlined` — DESIGN.md가 그림자를 라이트 모드 전용으로 묶어 두어, 이 앱의 모든 카드가 "보더 상시 + 그림자는 라이트에서만"이다. 둘은 별개 variant가 아니라 같은 카드가 테마에 따라 다르게 보이는 것이라 폐기했다.
- `Card.Header` — 화면들이 섹션 제목을 카드 밖에 두어 사용처가 0건이라 만들지 않았다.

사용처가 0건인 것은 만들지 않는다.

## 검증 절차

각 컴포넌트는 아래를 모두 통과해야 한다.

1. `npx tsc --noEmit`
2. `npm run storybook` — 스토리 정상 렌더
3. 다크/라이트 양쪽 확인 (배경 툴바 전환)
4. iPhone SE(320) 뷰포트에서 레이아웃 깨짐 없음
5. a11y 위반 0건
6. `design-system/index.ts`에 export 추가

### a11y 패널 주의

**Storybook a11y 패널은 HMR 후 자동 갱신되지 않는다.
코드 수정 후에는 반드시 패널의 재실행 버튼을 눌러
최신 결과를 확인할 것. 수정 전 결과가 남아 오판 위험.**

실제로 `Section` 작업 중 레이아웃 버그를 고친 뒤에도 패널이 수정 전 수치
(`Violations 1 / Passes 17`)를 그대로 표시했다. 재실행 버튼을 누른 뒤에야
`Violations 0`이 나왔다.

### a11y `region` 룰

`region` 룰은 `.storybook/preview.tsx`에서 꺼 두었다. story root가 landmark
밖이라 발생하는 Storybook 하네스 아티팩트이고, React Native 앱에는 landmark
개념이 없어 컴포넌트 결함을 가리키지 않는다. **다른 룰은 끄지 않는다.**

### 반투명 색 주의

배경에 알파를 남기면(`accent + "18"` 같은 8자리 hex) axe가 합성색을 풀지
못해 투명 조상을 흰색으로 가정하고, 다크 테마에서 존재하지 않는 대비 위반을
만든다. `tokens/accentTint()`처럼 **캔버스 기준으로 미리 합성한 불투명 색**을
쓴다. 부모 배경이 바뀌어도 결과가 흔들리지 않는 이점도 있다.

## spacing / radius 토큰

아직 추출하지 않았다. Phase 1-A 컴포넌트 5개가 모두 나온 뒤 실제 사용 분포를
보고 정한다. 지금 뽑으면 컴포넌트 한둘의 우연한 선택이 전체 스케일로 굳는다.
