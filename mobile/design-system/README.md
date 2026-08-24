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

**AST로 찾았더라도 속성을 읽을 때 "매치 줄 + N줄" 같은 고정 창을 쓰지 말 것.**
IconButton 조사에서 창이 자식 View의 스타일을 빨아들여 `filled` 17건 / `plain`
20건이 나왔는데, 여는 태그의 attributes로 범위를 좁히자 실제로는 **12 / 25**
였다. `WaterTracker.tsx:39`는 6줄 아래 진행 바의 `backgroundColor`가 딸려와
filled로 잘못 분류됐고, `barcode-scan.tsx:91`은 아래쪽 스캔 프레임의
260×160이 버튼 크기로 잡혔다. 노드의 시작·끝 위치로 잘라 읽어야 한다.

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

## 컴파일러로 규칙을 강제한 사례

`IconButton`의 `accessibilityLabel`은 **optional이 아니라 필수**다. 편의를
깎아서 얻은 것이 아니라 이 컴포넌트를 만든 이유 자체다.

DESIGN.md는 "아이콘 단독 버튼에는 `accessibilityLabel`이 필수"라고 규정한다.
그런데 실사용 37건 중 지키는 곳은 **1건**이었다. 규칙이 틀려서가 아니라
문서에 적힌 규칙에는 강제력이 없기 때문이다. 코드 리뷰가 매번 잡아주지
않으면 조용히 어긋나고, 어긋난 채로 1년을 간다.

타입으로 옮기면 성질이 달라진다. Phase 1-B에서 호출부를 옮길 때
`accessibilityLabel`이 빠진 36건은 **컴파일이 되지 않는다.** 잊을 수도, 나중에
하기로 미룰 수도 없다. 실제로 확인한 에러는 이렇다.

```
error TS2741: Property 'accessibilityLabel' is missing in type
'{ children: Element; onPress: () => void; }' but required in type 'IconButtonProps'.
```

같은 이유로 `target.min` 44도 문서가 아니라 컴포넌트 안에 넣었다. 37건 중
24건이 44에 도달할 수단이 없었는데(크기를 명시한 14건은 38·36·32·28처럼
**예외 없이 전부** 44 미만이고, `hitSlop`을 쓴 곳은 13건뿐이다),
`minWidth`/`minHeight`를 컴포넌트가 들고 있으면 호출부가 무엇을 하든 성립한다.

**원칙: 지켜지지 않는 문서 규칙을 발견하면 문구를 강하게 고치기 전에
타입이나 기본값으로 옮길 수 있는지 먼저 본다.**

## Phase 1-B 교체 대상

### IconButton — 37곳 / 15개 파일

`filled/plain`은 현재 배경색 유무로 판정한 값이다. 옮길 때 실물로 확인할 것.
`44 미달`은 고정 크기가 44 미만이면서 `hitSlop`도 없는 건수 —
IconButton으로 옮기면 자동 해소된다.

| 파일 | 건수 | filled / plain | label 있음 | 44 미달 | 줄 번호 |
|---|---|---|---|---|---|
| `app/(tabs)/diet.tsx` | 7 | 5 / 2 | 0 | 7 | 350, 381, 603, 738, 755, 949, 1078 |
| `app/(tabs)/workout.tsx` | 6 | 0 / 6 | 0 | 5 | 1016, 1024, 1037, 2238, 4597, 4674 |
| `app/modal/routine-manage.tsx` | 5 | 0 / 5 | 0 | 3 | 513, 516, 888, 1097, 1165 |
| `components/workout/ExerciseAdder.tsx` | 4 | 0 / 4 | 0 | 4 | 719, 751, 1023, 1156 |
| `app/(tabs)/stats.tsx` | 2 | 0 / 2 | 0 | 0 | 306, 312 |
| `app/modal/add-food.tsx` | 2 | 0 / 2 | 0 | 2 | 436, 681 |
| `components/ui/Header.tsx` | 2 | 2 / 0 | 0 | 0 | 51, 59 |
| `components/workout/SettingSelector.tsx` | 2 | 1 / 1 | 0 | 1 | 123, 187 |
| `app/modal/barcode-scan.tsx` | 1 | 1 / 0 | 0 | 1 | 91 |
| `app/modal/edit-profile.tsx` | 1 | 1 / 0 | 0 | 0 | 128 |
| `app/modal/full-calendar.tsx` | 1 | 0 / 1 | 0 | 0 | 98 |
| `components/RestTimer.tsx` | 1 | 0 / 1 | 0 | 0 | 411 |
| `components/RoutineColorPicker.tsx` | 1 | 1 / 0 | 0 | 1 | 66 |
| `components/WaterTracker.tsx` | 1 | 0 / 1 | 0 | 0 | 39 |
| `components/ui/ThemeToggle.tsx` | 1 | 1 / 0 | **1** | 0 | 10 |
| **합계** | **37** | **12 / 25** | **1** | **24** | |

주의할 곳:
- `filled`의 기본 배경은 `surfaceAlt`, 기본 radius는 pill(999)이다.
  벗어나는 곳은 `style`로 덮어야 모양이 유지된다:
  `diet.tsx:603·755`(radius 12), `diet.tsx:738`(radius 10 + `danger` 틴트),
  `barcode-scan.tsx:91`(카메라 위 `bg-black/50` — surfaceAlt로 두면 안 보인다),
  `RoutineColorPicker.tsx:66`(배경이 사용자가 고른 색),
  `SettingSelector.tsx:187`(`primary` 배경 = 선택 상태).
- `components/ui/Header.tsx`의 2건은 Header 자체를 design-system으로 옮길 때
  같이 처리하는 편이 낫다.
- `plain` 25건 중 19건은 `style`이 아예 없는 맨 터치 요소다. 옮기면 박스가
  44로 커지므로 밀집한 행에서 레이아웃이 밀릴 수 있다. 파일 단위로 옮기고
  화면을 눈으로 확인할 것.

### Button — 8곳 / 6개 파일

`components/ui/Button.tsx`의 `@deprecated` 주석에 변환 항목을 적어 두었다.

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
