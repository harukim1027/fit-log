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

**Phase 1-B 교체 대상 총계: 58곳 / 19개 파일**
(IconButton 37곳·15파일, ~~Header 13곳·10파일~~ ✅, ~~Button 8곳·6파일~~ ✅ — 파일은 겹친다).
**남은 것은 IconButton 37곳뿐이다.**
아래 "Phase 1-B 교체 대상"에 파일별 목록이 있다.

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
TouchableOpacity 2개 + `gap-1`, 합 116pt). 이번 교체 범위 밖이라 슬롯 폭이
그대로이고 제목이 밀리지 않는다. 320 폭 기준 제목 슬롯은
`320 - 16(좌우 패딩) - 56(좌측) - 116(우측) = 132pt`로 교체 전과 같다.
이 셋이 44로 커지는 것은 **IconButton 교체(37곳) 때**이고, 그때 우측 슬롯이
116 → 140pt가 되어 제목 슬롯이 132 → 108pt로 줄어든다. 그 시점에 다시
확인해야 한다.

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
3개(≈116pt)를 넣는 유일한 화면이다. **교체 후 시뮬레이터에서 확인했고
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
