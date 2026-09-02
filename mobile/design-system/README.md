# Harulog 디자인 시스템

앱과 분리 가능한 컴포넌트 라이브러리. Storybook으로 개발·검증한다.

```
design-system/
├── components/     # Card, Section, Button, IconButton, Header
├── tokens/
│   ├── index.ts    # 앱 constants/colors.ts로 가는 유일한 통로 + 색 헬퍼
│   └── scale.ts    # space / radius / size 수치 토큰 (여기가 원본)
└── index.ts        # 통합 export
```

## Phase 1-A 완료

컴포넌트 5개. 넷은 흩어진 패턴을 모은 신규 수렴이고, Header 하나는 이미
공용화돼 있던 것의 이전이다.

| 컴포넌트 | 성격 | 실사용 근거 | 만들지 않은 API와 근거 |
|---|---|---|---|
| **Card** | 신규 수렴 | 카드 패턴 다수 | `elevated`/`outlined` — 그림자가 라이트 전용이라 별개 variant가 아니라 같은 카드의 테마별 모습이었다. `Card.Header` — 제목을 카드 밖에 두어 사용처 0건 |
| **Section** | 신규 수렴 | 섹션 헤더 5건 (홈 2, 운동 2, 통계 1) | 섹션 레벨 `onPress` — 사용처 0건. 섹션 외부 여백 — 간격이 화면마다 달라(홈 20 / 통계 12) 부모 책임 |
| **Button** | 신규 수렴 | 폼 CTA 8곳 / 6파일 | `variant` — 8곳 전부 기본값, 실사용 0건. `size` — 0건. `fullWidth` — 8곳 중 7곳이 전체 폭이라 기본값화. `leftIcon` 0건, `rightIcon` 1건 |
| **IconButton** | 신규 수렴 | 아이콘 전용 터치 요소 37곳 / 15파일 | `size` — 아이콘 크기가 13~28에 11개 값으로 흩어져 밀도 판단에 딸림. `icon` name prop — 실사용이 `Icon`/`FlameIcon`/`HeartIcon` 등 여러 체계 |
| **Header** | **이전** | 13곳 / 10파일이 이미 단일 컴포넌트 사용 | 없음 — prop 7개 전부 실사용이라 제거 대상이 없었다 |

관통하는 원칙 하나: **실사용 0건인 API는 만들지 않는다.** Card의 variant 2종,
Button의 variant 4종·size, IconButton의 size가 전부 이 이유로 빠졌다.
같은 잣대를 토큰에도 적용해 radius의 chip 10 / sheet 24를 뽑지 않았다.

IconButton은 여기서 한 걸음 더 나가 `accessibilityLabel`을 **타입 필수**로 뒀다 —
"컴파일러로 규칙을 강제한 사례" 참조.

**~~Phase 1-B 교체 대상 총계: 58곳 / 19개 파일~~ ✅ 완료**
(~~IconButton 37곳·15파일~~ ✅, ~~Header 13곳·10파일~~ ✅, ~~Button 8곳·6파일~~ ✅ — 파일은 겹친다).
**IconButton은 실질 대상 35곳(삭제 예정인 `components/ui/Header.tsx` 2건 제외)을
전부 옮겼고, 원조사에 없던 `CuteAlert` 1건을 더해 호출부가 36곳이다.**
(`TargetMuscleSelector` 1건은 원조사 이후에 만들어져 처음부터 IconButton이라
호출부 총계로는 37곳이 된다.)

옮기지 않은 것은 **예외 3곳**뿐이다 — `components/ui/Header.tsx` 2건(삭제 예정),
`app/(tabs)/index.tsx:477`(이미 46 + 라벨 있음). 아래 "예외" 절에 사유가 있다.
파일별 목록은 "Phase 1-B 교체 대상"에 있다.

## 규칙

- `components/`는 앱 코드(`constants/`, `store/`)를 직접 import 하지 않는다. 반드시 `tokens/`를 거친다. 나중에 패키지로 분리할 때 `tokens/index.ts`만 교체하면 된다.
- 색 값을 복제하지 않는다. `constants/colors.ts`가 단일 진실 소스다. hex 하드코딩 금지.
- 컴포넌트끼리 import 하지 않는다. 조합은 사용처가 한다(예: `Section.Content` 안에 `Card`).
  **예외는 `Header` 하나뿐이다** — 아래 "Header의 의존성 예외" 참조.
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

### 검증용 임시 코드 원복 체크리스트

실물 확인을 하려면 아래를 임시로 바꿔야 하는 일이 반복된다. **원복을 놓치면
소스는 깨끗한데 앱만 이상하게 보인다** — 실제로 "운동 추가에 들어가자마자
기구 설정 시트가 열리고 입력창에 글자와 에러가 들어 있는" 상태를 만든 적이 있다.

임시로 바꾸게 되는 것들:

| 종류 | 예 |
|---|---|
| `useState` 초깃값 | 시트 열림, 입력 모드, 입력값, 에러, 선택 상태 |
| API 응답 덮어쓰기 차단 | `.then(res => { if (res.data.length) set(...) })` |
| 데이터 시드 | `useState([{ id: 't1', name: '밴드' }])` |
| 핸들러 무력화 | `deleteCustomKey` 앞에 `return` |
| 프로브 | `onLayout` 로그, `console.log` |

규칙:

1. **임시 변경에는 반드시 `// TEMP:` 주석을 단다.** 값만 바꾸면 나중에
   원래 값이 무엇이었는지 알 수 없다.
2. 작업 종료 전 `grep -rn "TEMP:"` 로 전량 확인한다.
3. `git diff` 로 최종 확인한 뒤 커밋한다.

**임시 코드를 넣기 전에 실작업을 먼저 커밋한다.** `git checkout -- <file>` 은
그 파일의 **커밋 안 된 작업까지 같이 날린다.** 프로브만 지울 생각으로 부르면
같은 파일에 있던 기능 코드가 함께 사라진다.

> 실제 사고: 기구 설정 오프라인 폴백(2단계) 작업분을 `ExerciseAdder.tsx` 에
> 써 놓고, 앞서 넣은 프로브를 지우려고 `git checkout --` 을 부르는 바람에
> 폴백 구현 전체를 잃고 다시 썼다.

순서를 바꾸면 사고가 안 난다: **실작업 커밋 → 임시 코드 삽입 → 검증 →
`git checkout` 으로 원복.** 이때의 checkout 은 커밋된 상태로 되돌리는 것이라
잃을 것이 없다.

`grep ... | head || echo "없음"` 처럼 쓰지 말 것 — 파이프의 종료 코드는
`head` 것이라 항상 0이고, `||` 뒤가 실행되지 않아 **확인한 척만 하게 된다.**
`grep -rn "TEMP:" ... ; echo "exit=$?"` 처럼 grep 자신의 결과를 본다.

#### 앱이 이상하면 소스보다 번들을 먼저 의심한다

소스를 원복해도 **시뮬레이터가 옛 번들을 물고 있으면 증상이 그대로다.**
Fast Refresh는 앱이 떠 있을 때만 반영되므로, 원복을 앱이 종료된 상태에서
했다면 다음 실행까지 반영되지 않는다.

```bash
xcrun simctl terminate <UDID> com.harulog.app
xcrun simctl launch    <UDID> com.harulog.app
```

`git status` 가 깨끗한데 화면이 이상하면 거의 항상 이 경우다.

### a11y 패널 주의

**Storybook a11y 패널은 HMR 후 자동 갱신되지 않는다.
코드 수정 후에는 반드시 패널의 재실행 버튼을 눌러
최신 결과를 확인할 것. 수정 전 결과가 남아 오판 위험.**

실제로 `Section` 작업 중 레이아웃 버그를 고친 뒤에도 패널이 수정 전 수치
(`Violations 1 / Passes 17`)를 그대로 표시했다. 재실행 버튼을 누른 뒤에야
`Violations 0`이 나왔다.

### 스크립트로 스토리를 훑을 때는 충분히 기다릴 것

여러 스토리를 자동으로 돌며 axe를 실행하면 **캔버스 배경이 칠해지기 전에
검사가 돌아** 없는 대비 위반이 무더기로 나온다. axe는 불투명 배경을 못 찾으면
흰색으로 가정하므로, 다크 테마 글자(`#e0e6ec`)가 흰 배경 위에 있다고 판단해
1.25:1 같은 값을 보고한다. **`bgColor`가 `#ffffff`로 찍히면 거의 항상 이 경우다.**

토큰 추출 작업에서 대기 1.1초로 훑었더니 Section 스토리 12건이 위반으로
나왔는데, 2.8초로 늘리자 다크는 0건이 됐다. 토큰 교체 전후를 `git stash`로
갈라 같은 조건에서 재보고 나서야 회귀가 아님을 확인할 수 있었다.
**위반이 갑자기 늘면 코드를 의심하기 전에 측정 방법부터 의심한다.**

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

## Header의 의존성 예외

`Header`는 design-system에서 유일하게 `tokens/` 밖을 import 한다. 나머지 넷은
React, react-native, `../../tokens`만 쓴다.

| 의존 | 쓰는 곳 | 뺄 수 있나 |
|---|---|---|
| `IconButton` | 뒤로/닫기 버튼 | 뺄 수 있지만 뺄 이유가 없다 (아래) |
| `components/AppIcons` | chevronLeft·close 글리프 | 아니오 — 자체 구현해도 아이콘은 그려야 한다 |
| `expo-router` | `onBack`/`onClose` 미전달 시 `router.back()` | 아니오 — 좌측 버튼이 있는 10곳 중 5곳이 이 기본값에 의존한다 |
| `react-native-safe-area-context` | 상단 인셋 | 아니오 — 헤더의 본질이다 |

`IconButton`을 자체 구현으로 대체하는 선택지를 검토했지만 택하지 않았다.
그렇게 해도 나머지 셋이 남아 독립성은 회복되지 않는 반면, 44 보장과
`accessibilityLabel` 필수를 Header가 한 벌 더 구현해야 한다 —
IconButton이 바로 그 두 가지를 위해 만들어진 컴포넌트인데도.
**"내부 import 금지"는 목적이 아니라 결합을 줄이려는 수단이고, 여기서는
수단을 지키려다 결합이 늘어나는 상황이었다.**

패키지로 분리한다면 교체 지점이 `tokens/` 하나가 아니라 아이콘과 라우팅까지
셋이 된다. 다른 컴포넌트로 이 예외를 넓히지 말 것.

## NativeWind rem 14 이슈

**NativeWind v4의 네이티브 `rem` 기본값은 16이 아니라 14다.** 그래서 Tailwind
간격·크기 클래스가 전부 웹에서 기대하는 값의 **0.875배**로 렌더된다. 웹 감각으로
`w-11 h-11`을 쓰면 44가 아니라 38.5가 나온다.

아래는 시뮬레이터에서 `onLayout`으로 잰 값이다 (iPhone 13 mini / 375pt).
렌더는 1/3pt 격자로 반올림되므로 31.5는 31.33으로, 38.5는 38.33~38.67로 찍힌다.

| 클래스 | 웹(rem 16) | 실제 |
|---|---|---|
| `w-9` / `h-9` | 36 | **31.5** |
| `w-10` / `h-10` | 40 | **35** |
| `w-11` / `h-11` | 44 | **38.5** |
| `p-1.5` | 6 | **5.25** |
| `p-2` / `px-2` | 8 | **7** |
| `p-4` / `px-4` | 16 | **14** |
| `py-1` | 4 | **3.5** |
| `px-3` / `py-3` | 12 | **10.5** |
| `p-5` / `px-5` / `mr-5` | 20 | **17.5** |
| `px-8` | 32 | **28** |
| `gap-1` / `gap-2` / `gap-3` | 4 / 8 / 12 | **3.5 / 7 / 10.5** |

**대괄호 임의값(`py-[7px]`, `w-[47%]`, `rounded-[20px]`)은 rem을 타지 않는다.**
`px` 리터럴은 그대로 pt로 들어간다. 스케일을 타는 것은 숫자 스케일 클래스뿐이다.

### `w-11 h-11`이 가장 위험하다

`w-11 h-11`은 웹에서 정확히 44라 **코드만 보면 `target.min`을 지킨 것처럼 보인다.**
실제로는 38.5라 미달인데, 리뷰에서도 grep에서도 걸리지 않는다. 앱 전체에서
`w-11 h-11`을 쓴 터치 요소는 `Stepper` 2곳이고 둘 다 `hitSlop`이 없다.

| 위치 | 실측 | 쓰이는 곳 |
|---|---|---|
| `components/ui/Stepper.tsx:54` (감소) | **38.33 × 38.67** | `set-target` 2곳, `add-food` 1곳 |
| `components/ui/Stepper.tsx:72` (증가) | **38.33 × 38.67** | 〃 |

`Stepper`는 무게·횟수·목표치를 반복해서 눌러 올리고 내리는 컨트롤이라,
미달 중에서도 탭 빈도가 가장 높은 축에 속한다.

### 전수 조사 — 크기 클래스를 가진 터치 요소 14곳

`TouchableOpacity` / `Pressable` / `Button` / `IconButton`에 붙은
`w-*` `h-*` `min-w-*` `min-h-*` `p*-*` 클래스를 AST로 모았다.
`히트 영역`은 박스 + `hitSlop`이고, 잰 값은 굵게 표시했다.

| 위치 | 클래스 | rem 14 | hitSlop | 히트 영역 | 44 |
|---|---|---|---|---|---|
| `ui/Stepper.tsx:54` | `w-11 h-11` | 38.5 | 없음 | **38.33 × 38.67** | ✗ |
| `ui/Stepper.tsx:72` | `w-11 h-11` | 38.5 | 없음 | **38.33 × 38.67** | ✗ |
| `stats.tsx:307` | `w-9 h-9` | 31.5 | 4 | **39.33 × 39.33** | ✗ |
| `stats.tsx:313` | `w-9 h-9` | 31.5 | 4 | **39.33 × 39.33** | ✗ |
| `add-food.tsx:308` | `px-3 py-[7px]` | 10.5 / 7 | 없음 | **76.33 × 34** | ✗ |
| `add-food.tsx:355` | `px-[18px] py-3` | 10.5 | 없음 | **57.33 × 38.67** | ✗ |
| `add-food.tsx:461` | `flex-1 py-2` | 7 | 없음 | 세로 ≈34 (추정) | ✗ |
| `add-food.tsx:674` | `px-3 py-1` | 10.5 / 3.5 | 없음 | 세로 ≈25 (추정) | ✗ |
| `barcode-scan.tsx:133` | `px-8 py-3` | 28 / 10.5 | 없음 | 세로 ≈38.7 (추정) | ✗ |
| `set-target.tsx:251` | `flex-1 py-3` | 10.5 | 없음 | **76.67 × 44** | ✓ |
| `stats.tsx:526` | `px-4` + `minHeight: 44` | 14 | 없음 | 세로 44 (인라인 명시) | ✓ |
| `onboarding.tsx:133` | `w-[47%] p-5` | 17.5 | 없음 | 측정 불가 | ✓ 추정 |
| `onboarding.tsx:181` | `flex-1 py-5` | 17.5 | 없음 | 측정 불가 | ✓ 추정 |
| `onboarding.tsx:216` | `px-3` | 10.5 | 없음 | 측정 불가 | ? |

측정 못 한 다섯 곳의 사유 — 전부 화면은 열리지만 그 요소가 렌더되지 않는다:
`stats.tsx:526`(운동 기록 0건이라 종목 칩이 없음), `add-food.tsx:461`(검색 결과를
탭해야 나옴), `add-food.tsx:674`(즐겨찾기 없음), `barcode-scan.tsx:133`(실제 스캔
성공 후에만), `onboarding.tsx`(신규 가입 직후에만 진입).
추정치는 같은 클래스를 쓴 형제의 실측에서 끌어왔다 — 예를 들어
`barcode-scan.tsx:133`의 `py-3`은 `add-food.tsx:355`에서 38.67로 쟀다.

`py-*`만 준 버튼의 높이는 글자 줄높이에 딸려 있어 클래스만으로는 확정할 수 없다.
`set-target.tsx:251`이 정확히 44인 것도 설계가 아니라 우연이다
(`py-3` 10.5×2 + 콘텐츠 23). **패딩으로 44를 맞추려 하지 말 것.**

### 별도 과제로 남긴다 — 이번에 고치지 않았다

기록만 하고 수정하지 않았다. 위 14곳 중 `stats.tsx:307·313` 둘만 IconButton
교체 대상(7단계)이고, **나머지 12곳은 라벨이 있는 버튼·칩·스테퍼라 IconButton의
범위 밖이다.** 미달 7곳(`Stepper` 2, `add-food` 4, `barcode-scan` 1)은
Phase 1-B가 끝난 뒤 별도로 다룬다.

고칠 때의 선택지는 IconButton에서 정리한 것과 같다 — 박스를 키우거나
`hitSlop`으로 채우거나. `Stepper`는 값 표시와 나란한 밀집 컨트롤이라
`hitSlop` 쪽이 유력하지만, 부모가 자르지 않는지 확인이 먼저다.

**원칙: 크기를 클래스로 준 터치 요소는 계산하지 말고 `onLayout`으로 잰다.**
스크린샷 픽셀 측정은 둥근 모서리의 안티에일리어싱 때문에 사방 1~2px씩 작게
잡히므로 교차검증용으로만 쓴다. `barcode-scan` 닫기 버튼을 픽셀로 재면 41.7,
`onLayout`으로 재면 42다.

## Phase 1-B 교체 대상

### ~~IconButton — 37곳 / 15개 파일~~ ✅ 완료 (실질 대상 35곳 전부 교체)

`filled/plain`은 현재 배경색 유무로 판정한 값이다. 옮길 때 실물로 확인할 것.
`히트 44 미달`은 **실제 히트 영역**(박스 + `hitSlop`)이 44에 못 미치는 건수다.
IconButton으로 옮기면 자동 해소된다. 줄 번호는 AST 재수집분(1-based)이다.

> **이 열의 첫 집계(24)는 정의가 틀렸다.** "고정 크기가 44 미만이면서 `hitSlop`도
> 없는 건수"로 셌기 때문에, `hitSlop`이 있지만 그래도 44에 못 미치는 곳이 전부
> 통과로 잡혔다 — `stats` 39.5, `full-calendar` 42, `WaterTracker` 38,
> `routine-manage:889·1098` 31, `RestTimer` 30. **`hitSlop`이 있다는 사실은
> 44를 채웠다는 뜻이 아니다.** 다시 세면 37곳 중 **33곳**이 미달이고, 44에 닿는
> 곳은 `Header` 2건(60), `edit-profile`(56), `ThemeToggle`(48) 넷뿐이었다.

| 파일 | 건수 | filled / plain | label 있음 | 히트 44 미달 | 줄 번호 |
|---|---|---|---|---|---|
| ~~`app/(tabs)/diet.tsx`~~ ✅ | 7 | 5 / 2 | 0 | 7 | 351, 382, 604, 739, 756, 950, 1079 |
| ~~`app/(tabs)/workout.tsx`~~ ✅ | 6 | 0 / 6 | 0 | **6** | 1016, 1024, 1037, 2238, 4597, 4674 |
| ~~`app/modal/routine-manage.tsx`~~ ✅ | 5 | 0 / 5 | 0 | **5** | 514, 517, 889, 1098, 1166 |
| ~~`components/workout/ExerciseAdder.tsx`~~ ✅ | 4 | 0 / 4 | 0 | 4 | 720, 752, 1024, 1157 |
| ~~`app/(tabs)/stats.tsx`~~ ✅ | 2 | 0 / 2 | 0 | **2** | 307, 313 |
| ~~`app/modal/add-food.tsx`~~ ✅ | 2 | 0 / 2 | 0 | 2 | 437, 681 |
| `components/ui/Header.tsx` | 2 | 2 / 0 | 0 | 0 | 58, 66 — **삭제 예정, 교체 안 함** |
| ~~`components/workout/SettingSelector.tsx`~~ ✅ | 2 | 1 / 1 | 0 | **2** | 123, 187 |
| ~~`app/modal/barcode-scan.tsx`~~ ✅ | 1 | 1 / 0 | 0 | 1 | 98 |
| ~~`app/modal/edit-profile.tsx`~~ ✅ | 1 | 1 / 0 | 0 | 0 | 128 |
| ~~`app/modal/full-calendar.tsx`~~ ✅ | 1 | 0 / 1 | 0 | **1** | 98 |
| ~~`components/RestTimer.tsx`~~ ✅ | 1 | 0 / 1 | 0 | **1** | 411 |
| ~~`components/RoutineColorPicker.tsx`~~ ✅ | 1 | 1 / 0 | 0 | 1 | 66 |
| ~~`components/WaterTracker.tsx`~~ ✅ | 1 | 0 / 1 | 0 | **1** | 39 |
| ~~`components/ui/ThemeToggle.tsx`~~ ✅ | 1 | 1 / 0 | **1** | 0 | 10 |
| **합계** | **37** | **12 / 25** | **1** | **33** | 실질 대상 35곳 전부 완료 |

교체 전 기준으로 **35곳 중 32곳이 히트 44 미달**이었고 `label`이 붙은 곳은
`ThemeToggle` 하나뿐이었다. 지금은 35곳 전부가 44를 보장받고 `label`을 가진다.

주의할 곳:
- `filled`의 기본 배경은 `surfaceAlt`, 기본 radius는 pill(999)이다.
  벗어나는 곳은 `style`로 덮어야 모양이 유지된다:
  `diet.tsx:603·755`(radius 12), `diet.tsx:738`(radius 10 + `danger` 틴트),
  `barcode-scan.tsx:91`(카메라 위 `bg-black/50` — surfaceAlt로 두면 안 보인다),
  `RoutineColorPicker.tsx:66`(배경이 사용자가 고른 색),
  `SettingSelector.tsx:187`(`primary` 배경 = 선택 상태).
- **`components/ui/Header.tsx`의 2건(58·66)은 교체하지 않는다.** Header 이전이
  끝나 이 파일은 배럴에서만 참조되는 삭제 예정 파일이다. 실질 대상은 **35곳**이고,
  그중 2곳을 옮겼으므로 **남은 실질 대상은 33곳**이다.
- `plain` 25건 중 19건은 `style`이 아예 없는 맨 터치 요소다. 옮기면 박스가
  44로 커지므로 밀집한 행에서 레이아웃이 밀릴 수 있다. 파일 단위로 옮기고
  화면을 눈으로 확인할 것.

#### 크기 수치는 rem 14 기준이다

이 절의 `현재 박스`·`증가`는 전부 rem 14로 환산했거나 `onLayout`으로 잰 값이다.
왜 그래야 하는지와 앱 전체 영향은 위의 **"NativeWind rem 14 이슈"** 절에 있다.

첫 집계가 틀렸던 두 곳:

| 위치 | 첫 집계 | 실측 | 원인 |
|---|---|---|---|
| `barcode-scan.tsx:98` | "이미 44 (아이콘 28 + p-2 8×2)" | **42** | `p-2`가 8이 아니라 7 |
| `stats.tsx:307·313` | 36 | **31.33** | `w-9 h-9`가 36이 아니라 31.5 |

`stats`가 틀리면서 헤더 우측 슬롯도 116이 아니라 **106**이었다.

#### 실측 방법 — 시뮬레이터를 탭 없이 몰아가기

Header 이전 때는 "시뮬레이터를 프로그램으로 탭할 수 없어 자동 확인이 불가능"
했지만, dev client는 **URL만으로 서버 교체와 화면 이동이 된다.**

```bash
# 1) metro를 빈 포트에 띄운다 (8081이 다른 프로젝트에 잡혀 있어도 된다)
npx expo start --port 8082

# 2) dev client를 그 서버에 붙인다 — 탭 없이 앱이 새 번들을 받는다
xcrun simctl openurl <UDID> \
  "exp+fitlog://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082"

# 3) 화면 이동도 딥링크로
xcrun simctl openurl <UDID> "exp+fitlog://stats"
xcrun simctl openurl <UDID> "exp+fitlog://modal/routine-manage?editId=<id>"

# 4) 스크린샷
xcrun simctl io <UDID> screenshot out.png
```

크기는 재고 싶은 요소에 `onLayout`을 **임시로** 붙여 `console.log`하고
metro 로그에서 읽는다. 화면 진입이 안 되는 곳도 이 방법이면 대부분 열린다.

주의할 점 셋:
- **딥링크를 연달아 보내면 모달이 쌓인다.** iOS 모달 스택은 한 겹마다 아래로
  내려가므로 같은 화면인데 좌표가 46pt씩 어긋난다. 비교 전에 2)로 리로드해
  네비게이션을 초기화할 것. 이걸 모르고 before/after를 재면 없는 이동이 보인다.
- **스크린샷 픽셀 ≠ pt.** iPhone 13 mini는 375pt를 1080px로 내려 담아 배율이
  3이 아니라 **2.88**이다. `1080 / 375`로 직접 구해 쓸 것.
- 화면 진입에 로그인·데이터가 필요한 곳(`routine-manage`의 편집 모드 등)은
  계정에 해당 데이터가 없으면 여전히 못 연다.

#### 교체 계획 — 위험도 분류

37곳을 AST로 재수집해(여는 태그 attributes 범위, 자식 아이콘 크기, 부모 행
구성) 분류했다. `현재 박스`는 명시 크기 또는 `아이콘 + padding×2`이고,
`style`이 없는 곳은 아이콘 크기 그대로 렌더된다.

판정 기준:
- **상** — 증가 20pt 이상 **이고** 같은 행에 폭을 다투는 요소(다른 터치 요소
  2개 이상 / 텍스트 / `flex: 1` 형제)가 있다 → 레이아웃이 확실히 밀린다
- **중** — 증가는 있으나 단독 배치이거나 행에 여유가 있다
- **하** — 이미 44 이상이거나 고정 슬롯이 흡수한다

**집계: 상 17곳 / 중 16곳 / 하 4곳** (교체 제외 2곳 포함한 37 기준)

| 위험 | 위치 | 현재 | 증가 | 같은 행 상황 |
|---|---|---|---|---|
| 상 | `workout.tsx:1016·1024·1037` | 16·17·17 | +28·27·27 | 루틴 카드 우측 아이콘 묶음. **행 하나가 +82pt** |
| 상 | `routine-manage.tsx:514·517` | 18·18 | +26·26 | 루틴 행 우측 2개. **행 +52pt** |
| 상 | `diet.tsx:950·1079` | 15·15 | +29 | 음식 행 `[kcal 텍스트][삭제]` |
| 상 | `routine-manage.tsx:889·1098` | 15 | +29 | `flex: 1` 형제와 같은 행 |
| 상 | `routine-manage.tsx:1166` | 20 | +24 | 시트 헤더 `[제목][닫기]` |
| 상 | `workout.tsx:2238` | 16 | +28 | 세트 행 (스테퍼와 같은 행) |
| 상 | `workout.tsx:4597` | 16 | +28 | 종목명 `TextInput`(높이 36)과 같은 행 |
| 상 | `workout.tsx:4674` | 14 | +30 | 세트 편집 행 |
| 상 | `add-food.tsx:681` | 20 | +24 | 즐겨찾기 행 `[추가][하트]` |
| 상 | `WaterTracker.tsx:39` | 18 | +26 | 헤더 행, `flex: 1` 형제 |
| 상 | `ExerciseAdder.tsx:720·752` | 16·16 | +28 | 검색 결과 행 |
| 중 | `diet.tsx:351·382` | 38 | +6 | 여유 있음 |
| 중 | `diet.tsx:604·739·756` | 32·28·32 | +12~16 | 단독에 가까움 |
| 중 | `stats.tsx:307·313` | **31.33** | **+12.67** | 헤더 우측 슬롯 **106 → 139.33pt** |
| 중 | `add-food.tsx:437` | 20 | +24 | 하트 토글, 행에 여유 |
| 중 | `edit-profile.tsx:128` | 36 | +8 | |
| 중 | `full-calendar.tsx:98` | 26 | +18 | |
| 중 | `RestTimer.tsx:411` | 14 | +30 | 단독 배치 |
| 중 | `RoutineColorPicker.tsx:66` | 36 | +8 | 배경이 사용자 선택 색 |
| 중 | `ExerciseAdder.tsx:1024·1157` | 28 | +16 | |
| 중 | `SettingSelector.tsx:123·187` | 13 · **42×36** | +31 · **가로 +2 / 세로 +8** | 187은 `paddingHorizontal 14 + 아이콘 14` |
| ~~하~~ ✅ | `barcode-scan.tsx:98` | **42** | **+2** | 1단계 교체 완료 (`e7c479e`) |
| ~~하~~ ✅ | `ThemeToggle.tsx:10` | **36 / 38** | **+8 / +6** | 2단계 교체 완료 (`c0de5c5`). 히트는 원래도 48이었으나 박스는 커진다 |
| 하 | `components/ui/Header.tsx:58·66` | 40 | +4 | **삭제 예정 — 교체 안 함** |

`stats.tsx:307·313`이 44가 되면 헤더 우측 슬롯이 **106 → 139.33pt**가 된다.
`ThemeToggle` 교체(2단계)로 이미 106 → 114를 지났고, 남은 두 개가 44가 되면
139.33이 된다. 320 폭에서 제목 슬롯은 **142 → (현재)134 → 108.67pt**다.
"통계"는 짧아 문제없지만 실측으로 다시 확인할 것.

> 2단계까지 끝난 시점에서 375 폭 시뮬레이터로 확인했다. 제목 슬롯 197 → 189,
> 클리핑 없음. 로그아웃 아이콘이 또 잘려 보였으나 5배 확대 결과 정상이었다
> (아래 "Header" 절에 적힌 착시. 이번이 세 번째다).

#### 교체 순서 제안

한 커밋에 한 파일. 되돌리기 쉽고, 화면 단위로 눈 확인이 가능하다.

| # | 파일 | 건수 | 최고위험 | 화면 / 진입 경로 |
|---|---|---|---|---|
| ~~1~~ ✅ | `app/modal/barcode-scan.tsx` | 1 | 하 | 식품 추가 → 바코드 |
| ~~2~~ ✅ | `components/ui/ThemeToggle.tsx` | 1 | 하 | 통계 헤더 우측 |
| ~~3~~ ✅ | `components/RoutineColorPicker.tsx` | 1 | 중 | 루틴 편집 → 색상 |
| ~~4~~ ✅ | `app/modal/edit-profile.tsx` | 1 | 중 | 통계 → 프로필 |
| ~~5~~ ✅ | `app/modal/full-calendar.tsx` | 1 | 중 | 홈 → 년월 스트립 |
| ~~6~~ ✅ | `components/RestTimer.tsx` | 1 | 중 | 운동 중 휴식 타이머 |
| ~~7~~ ✅ | `app/(tabs)/stats.tsx` | 2 | 중 | 통계 탭 |
| ~~8~~ ✅ | `components/workout/SettingSelector.tsx` | 2 | 중 | 종목 추가 → 설정 |
| ~~9~~ ✅ | `app/modal/add-food.tsx` | 2 | 상 | 식단 → 끼니 `+` |
| ~~10~~ ✅ | `components/WaterTracker.tsx` | 1 | 상 | 식단 → 물 카드 |
| ~~11~~ ✅ | `components/workout/ExerciseAdder.tsx` | 4 | 상 | 운동 → 종목 추가 |
| ~~12~~ ✅ | `app/(tabs)/diet.tsx` | 7 | 상 | 식단 탭 |
| ~~13~~ ✅ | `app/modal/routine-manage.tsx` | 5 | 상 | 홈 → 루틴 관리 |
| ~~14~~ ✅ | `app/(tabs)/workout.tsx` | 6 | 상 | 운동 탭 |

1~2로 워크플로우를 확립하고, 3~8에서 중간 위험을 다루고, 9 이후가 본 게임이다.
`workout.tsx`를 마지막에 둔 이유는 건수(6)와 위험도가 모두 최고이고
**행 하나가 +82pt** 늘어나는 최악의 사례가 거기 있기 때문이다.

**14단계까지 전부 끝났다.** 커밋은 파일당 하나씩이다.

`diet.tsx` 7건은 교체를 마쳤다. **diet 탭은 탭바에서 숨겨져 있지만
(`app/(tabs)/_layout.tsx:109`의 `href: null`, 주석 "파일 보존, 탭바에서 숨김")
`exp+fitlog://diet` 딥링크로는 진입된다** — 실제로 이 경로로 들어가 12단계를
픽셀 실측했다. 식단을 복원하면 그대로 쓸 수 있는 상태다.

> 작업 중 한때 "도달 불가 화면이라 제외" 쪽으로 기울었으나 **사실이 아니다.**
> 숨겨진 것은 탭바 진입점이지 라우트가 아니다. 같은 이유로 `WaterTracker`도
> 그대로 뒀다 — 그쪽은 오히려 참조가 0건이라(정의 외 사용처 없음) diet보다
> 더 확실히 화면에 안 뜨는데, 10단계에서 이미 옮겨 뒀다.

#### 실물 확인 현황 — 1~8단계

`onLayout` 실측 + 스크린샷으로 확인한 것과 못 한 것. 확인 방법은
위 "실측 방법" 절의 dev client + 딥링크 방식이다.

| # | 위치 | 확인 | 사유 / 실측값 |
|---|---|---|---|
| 1 | `barcode-scan.tsx:98` | ✅ | 박스 42 → 44 |
| 2 | `ThemeToggle.tsx:10` | ✅ | 36·38 → 44. 라이트 모드에서 MoonIcon 초승달 파내기까지 확인 |
| 3 | `RoutineColorPicker.tsx:66` | ❌ | 계정에 루틴 0개라 편집 화면 진입 불가. 계산만: 두 줄 유지, 높이 +16 |
| 4 | `edit-profile.tsx:128` | ✅ | 36 → 44, 제목 x좌표 불변 |
| 5 | `full-calendar.tsx:98` | ✅ | 26 → 44 |
| 6 | `RestTimer.tsx:411` | ❌ | 운동 세션이 활성일 때만 렌더된다. 가운데 `flex: 1` 시간 표시가 30 좁아지는 것 미확인 |
| 7 | `stats.tsx:307·313` | ✅ | rightSlot 114 → 139, titleSlot 189 → 164 |
| 8 | `SettingSelector.tsx:123` | ✅ | sheet 변형. hitSlop 모드로 묶음 폭 61.67 유지. **이후 삭제 배지가 "길게 누르기"로 바뀌면서 이 호출부는 사라졌다** — 지금 `SettingSelector`의 IconButton 2건은 둘 다 box다 |
| 8 | `SettingSelector.tsx:187` | ❌ | **inline 변형 전용이라 운동 세션 필요.** 아래 참조 |

`SettingSelector`는 `sheet` / `inline` 두 갈래로 갈라지고 **두 대상이 서로 다른
갈래에만 있다.** `:123` 삭제 배지는 `onDeleteExtraKey`를 넘기는 `ExerciseAdder:1349`
(sheet)에서만, `:187` 값 추가 버튼은 `if (!sheet)` 분기 즉 `workout.tsx:2478`
(inline)에서만 렌더된다. 시트에는 그 자리에 전체 폭 `추가하기` Button이 들어간다.

`:187`은 같은 행 `TextInput`이 36이라 버튼만 위아래로 4씩 삐져나온다.
그 자리만 고치면 안 되는 전역 문제라 "알려진 미해결 항목 → 입력 필드 터치영역
44 미달"에 등록했다.

#### 실물 확인 현황 — 11~14단계

같은 방식(dev client + 딥링크 + 스크린샷 픽셀 실측, iPhone 13 mini 375pt·배율 2.88).
데이터가 없어 화면에 안 나오는 곳은 `// TEMP:` 시드로 띄우고 전량 원복했다.

| # | 위치 | 확인 | 실측값 / 사유 |
|---|---|---|---|
| 11 | `ExerciseAdder` 4곳 | ✅ | 검색바 34.33pt, hitSlop이라 레이아웃 보존 |
| 12 | `diet.tsx:351` | ✅ | 38 → 43.75pt(126px), 좌측 여백 20.1pt 불변 |
| 12 | `diet.tsx:382` | ✅ | 비활성 상태에서 기존 opacity 0.3 유지 |
| 12 | `diet.tsx:604` | ✅ | 32 → 44.1pt(127×127px), radius 12 유지, 카드 안쪽 16pt 유지 |
| 12 | `diet.tsx:739·756` | ❌ | 간식 카드가 2개 이상일 때만 `×`가 뜬다. 계산: 묶음 68 → 96pt, 행 여유 318 중 206 |
| 12 | `diet.tsx:950·1079` | ❌ | 계정에 음식 기록 0건. hitSlop이라 레이아웃 변화는 정의상 없음 |
| 13 | `routine-manage.tsx:514·517` | ✅ | 연필·삭제 아이콘 중심 간격 43.5pt(박스 44 + gap 0). 9자 이름 잘림 없음 |
| 13 | `routine-manage.tsx:1098` | ✅ | 44 확보. 이름은 교체 전과 같이 말줄임 |
| 13 | `routine-manage.tsx:1166` | ✅ | 시트 헤더 닫기 44, 클리핑 없음 |
| 13 | `routine-manage.tsx:889` | ❌ | 결합 모드 진입이 탭 전용 |
| 14 | `workout.tsx:2238` | ✅ | **교체 전후 스크린샷 픽셀 차 0** — hitSlop이 레이아웃을 그대로 뒀다 |
| 14 | `workout.tsx:1016·1024·1037` | ✅ | 네 아이콘 + `시작`이 한 행에 들어가고 클리핑 없음. 이름 9자가 2줄로 접힘 |
| 14 | `workout.tsx:4597·4674` | ❌ | `HistoryCard` 편집 모드 — 히스토리 세션 + 편집 진입 필요 |

확인 못 한 6곳은 전부 **계정에 데이터가 없거나 탭이 필요한 경로**다.
시뮬레이터를 프로그램으로 탭할 수 없다는 제약은 그대로다(아래 참조).

##### 320pt 실측은 불가능하다

320pt 기기는 iPhone SE 1세대뿐인데 iOS 15에서 지원이 끊겨, 설치된 런타임
(17.2 / 26.5)에 올릴 수 없다(`Incompatible device`). 대신 375에서 텍스트의
**고유 폭**을 재서 320 슬롯과 비교한다 — `numberOfLines={1}`이라 이 값은
컨테이너 폭과 무관하다. `stats`가 이 방법으로 판정한 사례다.

##### 시뮬레이터를 프로그램으로 탭할 수 없다

`osascript`에 보조 접근 권한이 없어 창 열거·클릭 합성이 모두 막힌다(`-25211`).
`simctl`에는 탭 명령이 없고 `idb`도 설치돼 있지 않다. 따라서
**`hitSlop`이 실제로 44를 잡는지는 손으로 눌러 확인해야 한다.**
컴포넌트가 44를 넘기는 것까지는 런타임 로그로 확인했다
(`measured 13×13` → `hitSlop 15.5` 사방).

#### plain 19건 — 행 여유 문제

`style`이 없어 아이콘 크기 그대로 렌더되는 19건이다. 전부 44로 커진다.
같은 행에 몰린 두 곳이 특히 문제다.

| 행 | 개수 | 행 전체 증가 |
|---|---|---|
| `workout.tsx:1003` (루틴 카드 우측) | 3 | **+82pt** |
| `routine-manage.tsx:508` (루틴 행 우측) | 2 | **+52pt** |

`workout.tsx:1003`은 `[메뉴 16][잠금 16][연필 17][삭제 17]` + `gap: 10`이라
현재 95pt다. 44로 키우면 178pt가 되고, 왼쪽 `flex: 1` 루틴 이름 블록이
그만큼 줄어든다. 카드 안쪽 폭을 320 화면 기준 약 248pt로 보면
**이름 슬롯이 153pt → 70pt**가 된다. 루틴 이름이 대부분 잘린다.

**결정: 1번(box + `gap` 축소).** 3번(hitSlop)은 쓸 수 없다.

여기 적혀 있던 "3번이 유력하다"는 판단은 틀렸다. **hitSlop은 서로 겹친다.**
아이콘 중심 간격이 `workout` 26~27pt / `routine-manage` 28pt뿐이라 44 hitSlop이
사방 22씩 뻗으면 이웃과 16~17pt 겹치고, **겹친 구간은 뒤에 렌더된 형제가
가져간다.** 두 행 모두 마지막 형제가 삭제라 **연필 글리프의 오른쪽 끝을 눌러도
삭제가 잡힌다.** 파괴적 액션에는 쓸 수 없는 방식이다.

(3번의 "IconButton을 쓰지 못한다"도 사실이 아니다 — `touchTargetMode="hitSlop"`가
있어 44 보장과 `accessibilityLabel` 강제는 그대로 유지된다. 못 쓰는 이유는
오직 위의 겹침이다.)

그래서 두 행 다 box로 키우고 `gap`을 줄여 흡수했다.

| 행 | gap | 묶음 폭 | 결과 |
|---|---|---|---|
| `workout.tsx` 루틴 카드 | 10 → 4 | 96 → 160pt | 이름 슬롯이 좁아져 9자 이름이 2줄로 접힌다 |
| `routine-manage.tsx` 루틴 행 | 10 → 0 | 46 → 88pt | 이름이 `numberOfLines={1}`이라 말줄임 |

박스가 각각 13pt씩 여백을 가지므로 `gap`을 0까지 줄여도 아이콘 사이 간격은
시각적으로 유지된다. `workout`을 4로 둔 것은 이 행에 드래그 핸들과 `시작`
버튼까지 함께 있어 완전히 붙이면 핸들과 구분이 안 되기 때문이다.

**hitSlop을 쓴 곳의 기준은 "이웃을 침범하지 않는가"다.**

#### `touchTargetMode="hitSlop"` 실사용 — 36곳 중 11곳

| 파일 | 줄 | 자리 | hitSlop을 고른 이유 |
|---|---|---|---|
| `components/workout/ExerciseAdder.tsx` | 845 | 검색어 지우기 | 검색바 높이 34.33 유지 |
| | 882 | 종목 추가 폼 닫기 | 폼 헤더 20 → 44면 아래 전체가 +24 |
| | 1165, 1307 | 세트 삭제 ×2 | 세트 수만큼 누적(5세트면 +80) |
| `app/(tabs)/workout.tsx` | 2253 | 세션 세트 삭제 | 행이 이미 카드 폭을 넘긴다(아래 참조) |
| | 4713 | 초안 세트 삭제 | 세트 수만큼 누적 |
| `app/(tabs)/diet.tsx` | 940, 1073 | 음식 행 삭제 ×2 | 음식 수만큼 누적(행 50 → 64, 이름 −29) |
| `app/modal/add-food.tsx` | 698 | 즐겨찾기 하트 | 행에 여유가 없다 |
| `components/WaterTracker.tsx` | 54 | 헤더 액션 | `flex: 1` 형제와 같은 행 |
| `components/CuteAlert.tsx` | 112 | 알럿 닫기 | 절대 배치 — box면 × 가 8pt 안으로 |

**밀집 행 5건(`workout` 3 + `routine-manage` 2)에는 쓰지 않았다.** 그 5건이야말로
hitSlop의 원래 명분이었는데, 실제로 재 보니 아이콘 중심 간격이 26~28pt뿐이라
서로 겹쳐서 못 썼다. 남은 11곳은 전부 **혼자 있는 버튼이거나 반복되는 행**이다.
즉 이 prop이 실제로 하는 일은 "밀집 행 구제"가 아니라 **"반복 행의 높이 누적
방지"**다. 이름과 최초 명분이 실제 용처와 어긋나 있으니, Phase 2에서 이 prop을
다시 볼 때 이 기록부터 볼 것.

나머지 25곳은 box다. 기준은 (a) 같은 행 44 안에 다른 터치 요소가 있으면 box
(겹치면 뒤에 렌더된 쪽이 가져간다), (b) 행이 개수만큼 반복되고 이웃이 멀면
hitSlop이다.

#### 예외 — 옮기지 않기로 한 3곳

| 위치 | 사유 |
|---|---|
| `components/ui/Header.tsx:58·66` | **삭제 예정 파일.** Header 이전이 끝나 배럴에서만 참조된다. 옮길 이유가 없다 |
| `app/(tabs)/index.tsx:477` | **이미 44 충족(46 박스), `accessibilityLabel` 있음.** 얻을 것이 없다 |

`index.tsx:477`(프로필 편집)은 옮기지 않기로 확정했다. 이미 46×46이고
`accessibilityRole`·`accessibilityLabel`·`activeOpacity 0.7`이 전부 붙어 있어
IconButton이 더해 줄 것이 없다. 반대로 옮기면 `width`/`height` 46,
`borderRadius` 16, `backgroundColor` primary, 그림자를 전부 `style`로 다시
얹어야 하고 `filled`의 기본값(pill radius, surfaceAlt)까지 덮어야 한다 —
이득 없이 어긋날 자리만 늘어난다. 자식이 `Icon`이 아니라 `FaceAvatar`라
원조사 기준 밖이기도 하다.

#### 조사에서 빠졌던 곳

교체를 끝낸 뒤 앱 전체를 다시 훑어 찾은, 원래 37건에 없던 아이콘 단독
터치 요소다.

| 위치 | 처리 |
|---|---|
| `components/CuteAlert.tsx:101` | ✅ 교체 (`hitSlop` 모드) |
| `app/(tabs)/index.tsx:477` | 예외 — 위 참조 |
| `components/workout/TargetMuscleSelector.tsx:266` | 이미 IconButton. 원조사 이후에 만들어진 컴포넌트다 |

`CuteAlert`의 닫기 ×는 히트가 28 + `hitSlop 10` = **48로 이미 충분했다.**
옮긴 이유는 히트가 아니라 `accessibilityLabel`이다 — `showClose`는
`workout.tsx:579`("운동 종료" 확인)에서 실제로 쓰이는데, 스크린리더에는
이름 없는 버튼으로 읽혔다.

`box`가 아니라 `hitSlop`을 쓴 이유는 절대 배치다. 카드 우상단
`top:12 right:12`의 28 박스라 box로 44까지 키우면 × 글리프가 모서리에서
**8pt 안으로** 들어온다. `s.card`·`s.scrim` 어디에도 `overflow: hidden`이
없고 박스가 모서리에서 12pt 떨어져 있어 8pt 슬롭이 잘리지 않는다.
히트는 48 → 44로 줄지만 둘 다 `target.min`을 넘는다.

**구조 충돌은 없다.** `CuteAlert`는 iOS에서 `FullWindowOverlay`(별도 UIWindow)
안에 그려지는데, IconButton은 `TouchableOpacity` + `View`뿐이라 포털·제스처
핸들러·reanimated를 쓰지 않는다. import 방향도 `components → design-system`
한 방향이고(`SettingSelector`가 이미 같은 방향으로 쓴다), design-system이
되돌아 참조하는 것은 `components/AppIcons`뿐이라 순환이 생기지 않는다.

실물 확인: 알럿을 띄워 × 글리프의 x 중심을 쟀다. **310.4pt** —
28 박스 기준 예상값 311.5와 일치하고, box로 키웠을 때의 303.5와는 다르다.
레이아웃이 그대로라는 뜻이다.

#### 교체와 무관한 기존 결함 — 세트 행이 카드를 넘는다

`workout.tsx`의 진행 중 세션 세트 행
(`[N세트][−5][무게][+5]│[−1][횟수][+1][삭제]`)은 **교체 전부터 카드 폭을 넘겨
삭제 아이콘이 카드 바깥 배경 위에 렌더된다.** 무게 값이 길수록(60 → 62.5) 더
밀린다. iPhone 13 mini 실측에서 카드 오른쪽 끝은 351pt인데 2세트 행의 삭제
아이콘은 361~370pt에 있었다.

`2238`을 hitSlop으로 둔 것이 이 때문이다. box로 20pt를 더 키우면 밀림만 커진다.
**행 자체를 고치는 것은 이 작업의 범위 밖이라 남겨 둔다.**

### ~~Header — 13곳 / 10개 파일~~ ✅ 완료

전부 `design-system`으로 교체했다. API가 같아 **import 경로만 바뀌었고
prop은 한 곳도 손대지 않았다.** `components/ui/Header.tsx`는 참조 0을
확인했고 삭제는 Button과 함께 별도 커밋에서 한다.

#### 이전하며 생긴 시각 변화

| 항목 | 기존 | 새 Header | 영향 범위 |
|---|---|---|---|
| 제목 | 17/**700** | 17/**800** | 13곳 전부 |
| 부제 | 12/**400** | 12/**600** | subtitle 쓰는 2곳 |
| 뒤로·닫기 버튼 | 40×40 | **44×44** (IconButton) | 좌측 버튼 있는 10곳 |
| 접근성 | 라벨 없음 | `"뒤로 가기"` / `"닫기"` | 좌측 버튼 있는 10곳 |

**좌우 슬롯 폭과 제목 폭은 변하지 않는다.** `leftSlot`이 `width: 56` 고정이라
버튼이 40에서 44로 커져도 슬롯을 넘지 않는다(44 < 56). 세로로만 4pt 커져
**좌측 버튼이 있는 화면의 헤더 행이 4pt 높아진다** — 행 높이가
`paddingTop(insets.top+6) + 콘텐츠 + paddingBottom(10)`이고 콘텐츠 최대치가
버튼 높이이기 때문이다.

**`stats.tsx:300`의 rightElement 3개는 커지지 않는다.** 그 셋은 IconButton이
아니라 호출부가 직접 만든 요소다(`ThemeToggle size={36}` + `w-9 h-9`
TouchableOpacity 2개 + `gap-1`, 합 **106pt**). 이번 교체 범위 밖이라 슬롯 폭이
그대로이고 제목이 밀리지 않는다. 320 폭 기준 제목 슬롯은
`320 - 16(좌우 패딩) - 56(좌측) - 106(우측) = 142pt`로 교체 전과 같다.
이 셋이 44로 커지는 것은 **IconButton 교체(37곳) 때**이고, 그때 우측 슬롯이
106 → 139.33pt가 되어 제목 슬롯이 142 → 108.67pt로 줄어든다.

> 여기 적혀 있던 116·132는 `w-9 h-9`를 36으로 본 값이라 틀렸다. 실측은
> 31.33이고 `gap-1`은 3.67이다 — 위 "NativeWind의 `rem`은 16이 아니라 14다" 참조.

| 파일 | 줄 | 넘기는 prop |
|---|---|---|
| `app/(tabs)/diet.tsx` | 228 | title |
| `app/(tabs)/stats.tsx` | 300 | title, subtitle, rightElement |
| `app/(tabs)/workout.tsx` | 784 | title |
| `app/auth/register.tsx` | 38 | title, showBack |
| `app/modal/add-food.tsx` | 302 | title, subtitle, showClose, rightElement |
| `app/modal/barcode-scan.tsx` | 68 | title, showClose |
| `app/modal/routine-manage.tsx` | 359 | title, showClose |
| `app/modal/routine-manage.tsx` | 647 | title, showClose, onClose |
| `app/modal/routine-manage.tsx` | 743 | title, showClose, onClose |
| `app/modal/routine-manage.tsx` | 927 | title, showClose, onClose |
| `app/modal/set-target.tsx` | 225 | title, showClose |
| `app/onboarding.tsx` | 101 | title, showBack, onBack, rightElement |
| `components/workout/ExerciseAdder.tsx` | 638 | title, showClose, onClose |

`stats.tsx:300`의 `rightElement`가 클리핑 회귀의 발원지다 — 아이콘 버튼
3개(≈106pt)를 넣는 유일한 화면이다. **교체 후 시뮬레이터에서 확인했고
클리핑 없음.** IconButton 교체 때 다시 볼 것.

> 확인 중 로그아웃 아이콘이 잘린 것처럼 보였으나 확대해 보니 정상이었다.
> 글리프(`logout`)가 왼쪽이 열린 문 모양이라 오른쪽 끝에서 잘려 보인다.
> **이 착시로 오판한 적이 두 번 있다. 의심되면 반드시 확대해서 볼 것.**

#### 실물 확인 현황

| 화면 | 확인 | 진입 경로 |
|---|---|---|
| `(tabs)/stats` | ✅ | 통계 탭 |
| `(tabs)/workout` | ✅ | 운동 탭 |
| `(tabs)/diet` | ✅ | `exp+fitlog://diet` |
| `modal/routine-manage` (359) | ✅ | 홈 → 루틴 관리 카드 |
| `modal/set-target` | ✅ | `exp+fitlog://modal/set-target` |
| `modal/add-food` | ✅ | 식단 → 끼니 `+` |
| `auth/register` | ❌ | 로그아웃 후 로그인 화면 → 회원가입 |
| `onboarding` | ❌ | 신규 가입 직후에만 진입 |
| `modal/barcode-scan` | ❌ | 식품 추가 → 바코드. 화면은 열리지만 헤더 확인은 가능 |
| `routine-manage` 647·743·927 | ❌ | 루틴 관리 → 결합/편집/상세 모드 |
| `ExerciseAdder` | ❌ | 운동 시작 → 종목 추가 |

확인 못 한 것은 전부 **로그인 상태 때문에 딥링크가 홈으로 튕기거나(인증
가드), 화면 안에서 탭을 해야 도달**하는 곳이다. 시뮬레이터를 프로그램으로
탭할 수 없어(`osascript` 손쉬운 사용 권한 없음) 자동 확인이 불가능했다.

### ~~Button — 8곳 / 6개 파일~~ ✅ 완료

전부 `design-system`으로 교체했다. `components/ui/Button.tsx`는 참조 0을
확인했고 삭제는 별도 커밋에서 한다.

변환 방식:

| 기존 | 교체 후 |
|---|---|
| `title="저장"` | `children` (`<Button …>저장</Button>`) |
| `fullWidth` | 제거 (새 Button의 기본값) |
| `className="mt-2"` 등 4곳 | `style={{ marginTop: 8 }}` |
| `className="bg-workout"` 1곳 | `style={{ backgroundColor: c.workout }}` |
| `rightIcon` 1곳 | `children`으로 직접 구성 |
| 비-fullWidth 1곳 | `style={{ alignSelf: "center", paddingHorizontal: 32 }}` |

#### 교체하며 바뀐 것 — 시각 변화가 있었다

기존 `components/ui/Button`이 DESIGN.md에서 벗어나 있었기 때문에 교체가 곧
외관 변경이었다. 8곳 전부 해당한다.

| 항목 | 기존(size=lg 기본값) | 새 Button |
|---|---|---|
| `borderRadius` | 24 (`rounded-3xl`) | **999** (`radius.pill`) |
| `paddingHorizontal` | 32 (`px-8`) | **16** (`space[16]`) |
| 라벨 | 16/700 (`text-base font-bold`) | **14/800** (body-strong) |
| `activeOpacity` | 0.9 | **0.7** (`opacity.pressed`) |
| 누름 애니메이션 | spring scale 0.96 | **없음** |
| `marginHorizontal` | 10 (fullWidth 시 자동) | **0** |

`paddingVertical` 16과 disabled `opacity` 0.5는 동일하다.

특히 **`fullWidth`가 좌우 마진 10을 함께 넣고 있었다**(`marginHorizontal:
horizontalMargin ?? 10`). prop만 지우면 버튼이 20pt 넓어진다 — 의도한
결과지만 화면마다 여백이 달라 보일 수 있으니 확인이 필요하다.

#### 교체하며 발견한 새 Button의 부족한 점

**`children`이 문자열이 아니면 라벨 서식과 접근성 이름을 둘 다 잃는다.**
Button은 문자열일 때만 `<Text>`로 감싸 14/800 `onAccent`를 입히고,
`accessibilityLabel`도 문자열 children에서만 뽑는다. 아이콘을 곁들인
`onboarding.tsx`의 "다음" 버튼은 호출부가 **Button 내부의 라벨 스타일을
그대로 베껴 써야 했다.** 나중에 Button의 라벨 서식이 바뀌면 이 호출부만
드리프트한다.

`accessibilityLabel`이 optional이라 잊기도 쉽다 — IconButton처럼 필수였다면
컴파일러가 잡았을 것이다(문자열 children이 있으면 불필요하므로 단순 필수화는
답이 아니다).

이번에는 prop을 추가하지 않고 기록만 한다. 아이콘+라벨 사례가 1건뿐이라
API를 늘릴 근거가 부족하다. **두 번째 사례가 나오면 그때 판단한다.**

## 알려진 미해결 항목

각 항목이 지금 어디에 걸려 있는지부터 본다. **`synchronize` 때문에 실제로
막혀 있던 것은 하나뿐이었다** — 나머지는 Phase 1-B 뒤로 미뤄 둔 것이지
스키마와 무관하다.

| 항목 | 영역 | 상태 |
|---|---|---|
| 기구 설정 정렬 컬럼(`sortOrder`) | api 스키마 | **막힘 해제** — 마이그레이션으로 가능 |
| 입력 필드 터치영역 44 미달 | mobile | 미해결. 실측 필요(아래) |
| IconButton 범위 밖 44 미달 7곳 | mobile | 미해결 |
| 라이트 모드 의미색 대비 | 디자인 토큰 | 미해결. DESIGN.md가 이미 기록한 사실 |
| NativeWind `rem` 14 | mobile | 미해결. 위 두 항목의 공통 원인 |
| radius 사다리 실사용 0건 2개 | 디자인 토큰 | 미해결 |
| 바텀시트 값이 DESIGN.md와 어긋남 | mobile | 미해결 |
| `touchTargetMode` 이름/용처 불일치 | design-system | 미해결. Phase 2에서 재검토 |
| `canGoBack` 가드 부재 | mobile | 미해결. **재조사 필요**(아래) |
| 미저장 가드 | mobile | **부분 해소** — 기구 설정 시트 1곳 적용(아래) |
| 홈 "최근 기록" 전역 표시 불일치 | mobile | **재조사 필요**(아래) |

### 재조사가 필요한 항목

아래 셋은 기록된 수치가 여러 세션 전 것이라 지금과 맞지 않는다.
**착수 전에 다시 세고 시작할 것.**

- **`canGoBack` 가드** — "6곳"으로 적혀 있었으나 지금 `router.back()` 호출은
  17곳이고 `canGoBack` 가드는 0곳이다. 딥링크로 바로 진입한 화면에서
  뒤로 갈 곳이 없을 때의 동작이 정의돼 있지 않다.
- **미저장 가드** — "전무"는 더 이상 사실이 아니다. 기구 설정 시트에
  `onDirtyChange` 기반 닫기 확인이 들어갔다(`SettingSelector` → `ExerciseAdder`).
  **나머지 입력 화면에 같은 것이 없다**는 것이 남은 문제다. 적용 대상을
  다시 세고, 시트에 쓴 방식을 그대로 옮길지 판단할 것.
- **홈 "최근 기록" 전역 표시 불일치** — 무엇이 어떻게 어긋나는지가 기록에
  남아 있지 않다. 재현 경로부터 다시 적을 것.

### 바텀시트 값이 DESIGN.md와 어긋난다

시트 dismiss 표준화(오버레이 형제 분리 + 닫기 확인 + `onRequestClose` 보완)를
하면서 **동작만 고치고 값은 손대지 않았다.** DESIGN.md는 omd 투영본이라 직접
편집 대상이 아니고, 스크림은 아예 토큰이 없어 신설 여부가 별도 판단이다.

앱의 바텀시트는 네 개다.

| 시트 | 파일:줄 |
|---|---|
| 기구 설정 추가 | `components/workout/ExerciseAdder.tsx:1487` |
| 루틴에서 가져오기 | `app/(tabs)/workout.tsx:3096` |
| 운동 기록에서 불러오기 | `app/modal/routine-manage.tsx:1167` |
| 숫자 패드 | `components/ui/NumberPad.tsx:62` |

| 항목 | DESIGN.md | 현재 |
|---|---|---|
| 시트 상단 radius | `radius.sheet` **24** (104줄) | 기구 설정 **28**, 숫자 패드 **28**, 나머지 둘 24 |
| 그래버 색 | `surface-high` (135줄 "시트 그래버") | 기구 설정 **`textMuted`**, 숫자 패드 `surfaceHigh` |
| 스크림 | **토큰 없음** | `rgba(0,0,0,0.5)` / `0.3` / `0.55`, 기구 설정 `rgba(30,80,65,0.4)`, CuteAlert `rgba(5,9,14,0.55)` — 전부 하드코딩이라 "색은 하드코딩하지 않는다"(137줄) 위반 |
| 전개 시간 | `duration.sheet` **260ms** (97줄) | RN `<Modal animationType="slide">`의 고정값이라 **지정할 수 없다.** 지키려면 커스텀 시트로 옮겨야 한다 |

그래버는 네 시트 중 둘(기구 설정·숫자 패드)에만 있고, 넷 다 **드래그되지 않는
시각 표시**다. 드래그 dismiss는 범위 밖으로 남겼다 — `@gorhom/bottom-sheet`
5.2.14가 `package.json`에 있으나 **앱 코드에서 import 0건**이라, 사용 이력이
없는 의존성을 시트 네 개에 한 번에 넣지 않기로 했다.

### 기구 설정 항목 정렬 순서가 보존되지 않는다

`workout_setting_presets` 에 정렬 컬럼이 없다. `findAll` 이 `createdAt ASC` 로
나열하므로, 기본 항목을 지웠다가 "기본 항목 되돌리기"로 복구하면 **복구된 것이
목록 끝으로 간다.**

```
시트높이 등받이각도 그립종류 발판위치 바높이 인클라인각도
  → 그립종류·바높이 삭제 → 되돌리기 →
시트높이 등받이각도 발판위치 인클라인각도 그립종류 바높이
```

순서를 보존하려면 `sortOrder` 컬럼이 필요하다.

**막혀 있던 이유는 사라졌다.** `DEPLOY-BLOCKERS.md` 항목 1이 해소되어
마이그레이션으로 컬럼을 추가할 수 있다(PR #37). 이제는 스키마 변경 자체가
아니라 **마이그레이션에 데이터 이행까지 함께 쓸 것인가**가 판단할 지점이다 —
기존 행의 `sortOrder`를 `createdAt` 순으로 채우는 `UPDATE`가 필요하다.
컬럼 `default` 추가만으로는 기존 행이 채워지지 않는다.

### 기존 사용자 백필은 불필요하다

기구 설정 기본 항목을 사용자 소유 데이터로 옮기면서 "이미 가입한 사용자는
어떻게 채우나"가 문제였는데, **백필이 필요 없다는 결론이다.**

`POST /workout-settings/restore` 가 시드 이력과 무관하게 동작하기 때문이다 —
현재 목록과 기본 목록의 차집합만 채우므로, 0행인 사용자가 부르면 6개가
그대로 생긴다. 각 사용자가 "기본 항목 되돌리기" 버튼으로 스스로 해결한다.

덕분에 **운영 DB 쓰기를 피했다.** 백필 SQL과 롤백 SQL은 작성해 뒀고 로컬
리허설(5명 × 6 = 30행, 커밋 없이 롤백 확인)까지 마쳤지만 실행하지 않았다.
"미리 채워 두고 싶다"는 편의 목적 외에는 쓸 이유가 없다.

### 입력 필드 터치영역 44 미달

DESIGN.md 145번 줄: **탭 가능한 요소의 히트 영역은 `target.min`(44) 미만이 될 수 없다.**
DESIGN.md 264번 줄: `input` 컴포넌트의 Token references에 `target.min`이 들어 있다.
그러므로 `height: 36`인 입력 필드는 계약 위반이다.

현황 (AST 기준, `TextInput` 20건):

| 구분 | 건수 | 비고 |
|---|---|---|
| 높이 명시 | 4 | |
| └ 그중 44 미만 | **2** | `app/(tabs)/workout.tsx:4581` (36), `components/workout/SettingSelector.tsx:176` (36) |
| 높이 미명시 | 16 | 폰트·패딩에 딸린 값이라 정적으로 판정 불가. **실측 필요, 미달 가능성 있음** |

**두 명시 건이 모두 36이라 현재는 일관돼 있다. 한 곳만 고치면 어긋난다.**
전역으로 한 번에 처리할 것.

이 문제는 `SettingSelector.tsx:187`(inline 변형의 값 추가 버튼)에서 눈에 띈다.
그 버튼을 IconButton으로 옮기면서 44×44가 됐는데 같은 행의 `TextInput`은 36
그대로라, `alignItems: "center"`에서 버튼만 위아래로 4씩 삐져나온다.
**그 자리만 고치지 말 것** — 여기서 다뤄야 할 전역 문제다.

> `grep -c "<TextInput"`은 26을 센다. 6건은 JSX가 아니라 제네릭 타입 인자다 —
> `forwardRef<TextInput, InputProps>`, `useRef<TextInput>(null)`.
> "grep 결과는 그대로 세지 않는다" 사례가 하나 더 늘었다.

**처리 시점: Phase 1-B 완료 후 또는 Phase 2.**

### 터치 영역 44 미달 — IconButton 범위 밖 7곳

`Stepper` 2곳(38.5), `add-food` 4곳, `barcode-scan.tsx:133`이 `target.min` 44에
못 미친다. 전부 라벨이 있는 버튼·칩·스테퍼라 IconButton으로 흡수되지 않는다.
원인과 실측값은 **"NativeWind rem 14 이슈"** 절에 있다. Phase 1-B 이후 과제다.

### 라이트 모드 의미색 대비 미달

**다크 모드는 전 스토리 위반 0건이다. 아래는 전부 라이트 전용이다.**

스토리 37개 × 다크/라이트 74조합을 훑은 결과 라이트에서만 9건이 나왔고,
셋 다 같은 뿌리다 — DESIGN.md가 이미 기록한 "라이트 테마 의미색은 본문 크기
텍스트 대비에 미달한다"는 사실이다. 컴포넌트 결함이 아니다.

| 조합 | 실측 | 필요 | 나오는 곳 |
|---|---|---|---|
| `#FFFFFF` on `#1E7AEA` (primary) | **4.17:1** | 4.5:1 | Button 스토리 4개 |
| `#1E7AEA` (primary) on `#F2F6FB` (background) | **3.84:1** | 4.5:1 | Section 스토리 4개 — `LinkAction`("전체 보기 ›", 11/700) |
| `#FFFFFF` on `#E0950F` (warning) | **2.47:1** | 4.5:1 | Section 스토리 1개 — `ButtonAction`("운동 시작", 14/800) |

첫 줄은 DESIGN.md `contrast_pairs`가 `on-accent on primary: minimum 4:1`로
**의도적으로 완화**해 둔 쌍이다. 나머지 둘은 Foundation 규칙이 이미 수치까지
적어 둔 것과 일치한다("흰 카드 위 실측 대비는 danger 3.19, success 3.32,
warning 2.48, primary 4.18로 모두 4.5:1에 못 미친다").

**스토리 픽스처를 통과하는 색으로 바꾸지 않았다.** `LinkAction`과
`ButtonAction`은 홈의 "전체 보기"와 운동의 "운동 시작"을 그대로 재현한 것이라,
색을 갈아 검사만 통과시키면 스토리가 앱의 실제 모습에 대해 거짓말을 하게 된다.
미달은 미달대로 두고 여기 기록한다.

- 영향 범위: `c.onAccent` 사용 14개 파일 36곳 + 라이트 의미색 텍스트 전반
- 처리 시점: Phase 2 디자인 재작업
- 처리 방법: `constants/colors.ts`와 DESIGN.md를 **같은 커밋에서** 수정해야
  한다. 색 토큰 변경은 거버넌스 사안이라 컴포넌트 작업 중에 끼워 고치지 않는다.

다크 모드는 `#021526` on `#2E82F0` = 4.89:1로 통과한다.

## DESIGN.md와의 불일치

### radius 사다리 5단계 중 2개가 실사용 0건

DESIGN.md의 radius 토큰은 chip 10 / control 12 / card 16 / sheet 24 / pill 999
다섯 단계다. Phase 1-A 컴포넌트 5개가 실제로 쓴 것은 **12, 16, 999 셋뿐**이고
**chip 10과 sheet 24는 0건**이다. 그래서 `tokens/scale.ts`에 셋만 담았다.

이건 Button의 `variant`가 primary/secondary/ghost/danger 4종을 노출하는데
호출부 8곳 전부가 기본값만 쓰던 것과 **같은 현상이 디자인 문서 레벨에서
일어난 것**이다. 컴포넌트에서는 실사용 0건인 API를 만들지 않는다는 원칙을
지켜 왔는데, 문서의 토큰 사다리에는 같은 잣대를 적용한 적이 없었다.

사다리에 칸이 있다는 것 자체는 문제가 아니다 — 태그와 바텀시트 컴포넌트가
아직 없을 뿐이다. 다만 **"DESIGN.md에 있으니 토큰으로 뽑는다"는 근거로는
부족하다**는 것이 이번에 드러났다. 실사용이 생기면 그때 올린다.

- 처리 시점: Phase 2 디자인 재작업
- **DESIGN.md는 이번에 수정하지 않았다** — 거버넌스 사안이고, 실사용 0건이
  값이 틀렸다는 뜻도 아니다.

## spacing / radius / size 토큰

`tokens/scale.ts`에 있다. Phase 1-A 컴포넌트 5개가 모두 나온 뒤에 뽑았다 —
먼저 뽑았으면 컴포넌트 한둘의 우연한 선택이 전체 스케일로 굳었을 것이다.

| 축 | 담은 값 | 네이밍 |
|---|---|---|
| `space` | 2, 8, 10, 12, 16 | 값 기반 (`space[8]`) |
| `radius` | `control` 12, `card` 16, `pill` 999 | 의미 기반 |
| `size` | `touchTarget` 44 | 의미 기반 |

**값이 같아도 축이 다르면 별도 토큰이다.** `radius.control`(12)과 `space[12]`는
숫자가 같지만 분리한다. Card가 한 스타일에서 둘을 겸하기 때문이다
(`nested: { borderRadius: 12, padding: 12 }`). 묶으면 모서리만 바꾸려 할 때
패딩이 따라 움직인다.

**space만 값 기반으로 이름 붙였다.** `space.sm` 같은 의미 이름을 쓰려면
"sm이 무엇과 무엇 사이인가"가 정해져 있어야 하는데 아직 사용처가 그 축을
확정할 만큼 모이지 않았다. radius는 DESIGN.md가 이미 용처를 규정해 두어
그 이름을 그대로 썼다. Phase 1-B에서 호출부 58곳을 옮기고 나면 space의
의미 축도 드러날 것이다.

**뽑지 않은 것**
- radius `chip` 10, `sheet` 24 — DESIGN.md 사다리에 있으나 실사용 0건.
  위 "DESIGN.md와의 불일치" 참조.
- `56` — Header의 행 높이이자 좌우 슬롯 폭. 사용처가 Header 하나뿐이라
  `Header.tsx`의 `SLOT` 상수로 남겼다. 두 번째 사용처가 생기면 승격한다.
- space `4`, `6`, `20`, `24` — DESIGN.md에 있고 화면 레이아웃에서는 쓰이지만
  컴포넌트 내부에서는 아직 0건이다.
