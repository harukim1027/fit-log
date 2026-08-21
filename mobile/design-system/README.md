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

### grep 결과는 그대로 세지 않는다

**grep 결과는 파일별로 실물 확인한 뒤 집계할 것.
Button 사전 조사에서 `Record<ButtonVariant, …>` 5건이 호출부로 오탐돼
13 → 8로 정정된 사례가 있다.**

`<Button` 같은 패턴은 타입 선언·제네릭·주석에도 걸린다. 건수를 보고할 때는
오탐 제외분을 함께 적는다. 실제로 이 규칙을 만든 뒤 첫 조사에서도
`activeOpacity`가 `active`에 걸려 Chip 후보 90건이 전부 "선택 상태 있음"으로
잡히는 오탐이 나왔다(실제 9건). 패턴이 흔한 단어를 포함하면 특히 위험하다.

가능하면 텍스트 grep 대신 TypeScript AST로 센다. JSX 자식 구성이나
prop 유무처럼 "형태가 수렴하는가"를 판단하는 근거는 grep으로 얻기 어렵다.

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

## 알려진 미해결 항목

### 라이트 모드 primary 대비 4.17:1 (필요 4.5:1)

`#FFFFFF` on `#1E7AEA`. 14px/800은 WCAG large text(18.66px bold 이상)가
아니므로 4.5:1이 필요하다.

DESIGN.md의 `contrast_pairs`가 이 쌍을 `minimum 4:1`로 명시하고 있다 —
미달을 모르고 지나친 게 아니라 **의도적으로 완화한 값**이다. 그래서 Button
스토리의 라이트 모드 a11y 위반 1건은 컴포넌트 결함이 아니다.

- 영향 범위: `c.onAccent` 사용 14개 파일 36곳 (앱 전역 primary CTA 전부)
- 처리 시점: Phase 2 디자인 재작업
- 처리 방법: `constants/colors.ts`와 DESIGN.md를 **같은 커밋에서** 수정해야
  한다. 색 토큰 변경은 거버넌스 사안이라 컴포넌트 작업 중에 끼워 고치지 않는다.

다크 모드는 `#021526` on `#2E82F0` = 4.89:1로 통과한다.

## spacing / radius 토큰

아직 추출하지 않았다. Phase 1-A 컴포넌트 5개가 모두 나온 뒤 실제 사용 분포를
보고 정한다. 지금 뽑으면 컴포넌트 한둘의 우연한 선택이 전체 스케일로 굳는다.
