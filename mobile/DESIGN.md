# Harulog Design System

<!-- design-md:section experience -->
## 1. Experience

<!-- design-md:claim scope kind=product-surface lang=en -->
### Scope

Harulog는 웨이트 트레이닝 숙련자가 운동 세트, 식단, 체중을 한 앱에서 기록하고 추이를 확인하는 iOS 앱이다. 사용자는 한 세션에서 수십 개의 숫자를 입력하고 다시 읽는다. 따라서 이 시스템의 기본 자세는 '한 화면에 더 많은 사실을, 더 적은 장식으로'다. 다크 모드가 기본 상태이고 라이트 모드는 같은 위계를 그대로 재현한다.
<!-- design-md:claim-end -->

<!-- design-md:claim primary-tasks kind=user-outcomes count=5 lang=en -->
### Primary tasks

- 운동 중 세트별 무게·횟수를 최소 탭으로 입력하고 완료 표시한다.

- 루틴을 만들고 부위별로 정렬해 다음 세션에 재사용한다.

- 진행 중이던 운동 세션을 이어하거나 복구한다.

- 식단과 칼로리를 사진 또는 직접 입력으로 기록한다.

- 체중과 운동 볼륨의 추이를 통계 화면에서 확인한다.
<!-- design-md:claim-end -->

### Design direction

- 다크가 기본이고 라이트가 대응이다. 두 테마는 같은 명도 계단(캔버스 → 카드 → 중첩 → 시트)을 같은 순서로 갖는다. 라이트를 다크의 색 반전으로 만들지 않는다.

- 밀도를 먼저 지키고 여백은 그다음이다. 여백은 행 사이가 아니라 의미 덩어리 사이에 쓴다. 한 카드 안의 리스트 행은 붙이고, 카드와 카드 사이는 벌린다.

- 위계는 크기가 아니라 굵기로 만든다. 본문 밴드를 좁게 유지하고(11–17px) 500–900 굵기로 층을 나눈다. 새 글자 크기를 추가하기 전에 굵기로 해결되는지 먼저 본다.

- 파란색은 예산이다. 한 화면에서 primary는 주요 액션 하나와 현재 상태 표시에만 쓴다. 카드 배경, 구분선, 비활성 아이콘에 쓰지 않는다.

- 다크에서 깊이는 그림자가 아니라 명도 차이와 1px 보더로 만든다. 그림자는 라이트 모드에서만 쓴다.

### Principles

- 숫자가 주인공이다. 세트, 무게, 횟수, 칼로리, 체중은 항상 같은 자리·같은 굵기·고정폭 숫자로 읽힌다.

- 기록 중에는 앱이 방해하지 않는다. 운동 중 화면에서 확인 다이얼로그는 파괴적 액션에만 띄운다.

- 색만으로 뜻을 전달하지 않는다. 실패·경고·성공은 색과 함께 아이콘 또는 텍스트를 동반한다.

- 같은 정보는 탭이 달라도 같은 컴포넌트로 보인다. 홈의 요약 카드와 통계의 요약 카드는 같은 규칙을 따른다.

### Avoid

- 장식용 그라디언트, 유리 효과, 큰 히어로 이미지 — 정보 밀도를 깎는다.

- 다크 모드에서 그림자로 카드를 띄우기 — iOS 다크 배경에서는 거의 보이지 않는다.

- 한 화면에 3개 이상의 강조색 동시 사용.

- 레퍼런스의 시그니처 그린(#1ed760) 또는 음악 재생 관련 은유(앨범 아트, 플레이어 바) 도입 — Harulog의 도메인이 아니다.

- 글자 크기를 새로 만들어 위계를 늘리기 — 이미 정의된 7개 역할 안에서 해결한다.

<!-- design-md:section foundations -->
## 2. Foundations

<!-- design-md:claim foundations kind=rules-or-constraints lang=en -->
### Semantic tokens

- **border.hairline**: `1` — 다크 모드 계층 분리에 쓰는 유일한 선 두께.
- **color.dark.background**: `#171B21` — L0 캔버스. 스크린 최하단 배경.
- **color.dark.border**: `#384049` — 1px 구분선. 다크에서 그림자를 대신한다.
- **color.dark.danger**: `#F07A95` — 삭제·실패. 아이콘 또는 텍스트 동반 필수.
- **color.dark.on-accent**: `#021526` — primary 배경 위 라벨.
- **color.dark.primary**: `#2E82F0` — 주요 액션과 현재 상태. 화면당 예산 제한.
- **color.dark.secondary**: `#5B9BD9` — 보조 강조, 운동 카테고리.
- **color.dark.success**: `#4FA98C` — 완료된 세트, 목표 달성.
- **color.dark.surface**: `#21272F` — L1 카드. 캔버스 위 기본 컨테이너.
- **color.dark.surface-alt**: `#22303F` — L2 중첩. 카드 안의 행, 선택된 상태, 입력 필드.
- **color.dark.surface-high**: `#2A3340` — L3 시트·모달·활성 세그먼트.
- **color.dark.text-muted**: `#646E7A` — 단위, 비활성 힌트. 본문 크기 필수 정보에는 쓰지 않는다.
- **color.dark.text-primary**: `#E0E6EC` — 제목과 값.
- **color.dark.text-secondary**: `#909AA6` — 본문 보조, 라벨.
- **color.dark.warning**: `#E8A93C` — 주의, 통계 경고 구간.
- **color.light.background**: `#F2F6FB` — L0 캔버스.
- **color.light.border**: `#DCE6F0` — 1px 구분선.
- **color.light.danger**: `#EF5E80` — 삭제·실패.
- **color.light.on-accent**: `#FFFFFF` — primary 배경 위 라벨.
- **color.light.primary**: `#1E7AEA` — 주요 액션과 현재 상태.
- **color.light.secondary**: `#5B9BD9` — 보조 강조.
- **color.light.success**: `#2E9E83` — 완료·달성.
- **color.light.surface**: `#FFFFFF` — L1 카드.
- **color.light.surface-alt**: `#EAF1F8` — L2 중첩.
- **color.light.surface-high**: `#E4ECF4` — L3 시트·모달.
- **color.light.text-muted**: `#9AA6B4` — 단위, 비활성 힌트.
- **color.light.text-primary**: `#16202B` — 제목과 값.
- **color.light.text-secondary**: `#5A6675` — 본문 보조, 라벨.
- **color.light.warning**: `#E0950F` — 주의.
- **duration.press**: `120ms` — 탭 피드백.
- **duration.row**: `180ms` — 리스트 행 삽입·삭제·스와이프 복귀.
- **duration.sheet**: `260ms` — 바텀시트 전개.
- **opacity.disabled**: `0.5` — 비활성 상태. disabled prop과 함께 쓴다.
- **opacity.pressed**: `0.7` — TouchableOpacity activeOpacity 통일값.
- **radius.card**: `16` — 카드 기본.
- **radius.chip**: `10` — 태그·라벨.
- **radius.control**: `12` — 입력 필드, 카드 안 중첩 블록.
- **radius.pill**: `999` — 버튼, 세그먼트, 아바타, 진행 바.
- **radius.sheet**: `24` — 바텀시트·모달 상단.
- **space.10**: `10` — 칩·태그 가로 패딩.
- **space.12**: `12` — 밀집 카드 내부 패딩, 행 세로 패딩.
- **space.16**: `16` — 카드 내부 패딩 기본, 스크린 좌우 여백.
- **space.2**: `2` — 값과 단위 사이.
- **space.20**: `20` — 의미 덩어리 사이.
- **space.24**: `24` — 섹션 사이, 시트 상단 여백.
- **space.4**: `4` — 가장 가까운 인접 요소.
- **space.6**: `6` — 밀집 행 내부 간격.
- **space.8**: `8` — 리스트 행 사이 기본.
- **target.min**: `44` — 탭 가능한 요소의 최소 히트 영역(pt).

### Contrast pairs

- color.dark.text-primary on color.dark.background: minimum 4.5:1
- color.dark.text-primary on color.dark.surface: minimum 4.5:1
- color.dark.text-secondary on color.dark.surface: minimum 4.5:1
- color.dark.on-accent on color.dark.primary: minimum 4:1
- color.light.text-primary on color.light.background: minimum 4.5:1
- color.light.text-primary on color.light.surface: minimum 4.5:1
- color.light.text-secondary on color.light.surface: minimum 4.5:1
- color.light.on-accent on color.light.primary: minimum 4:1

### Reduced motion

Required.

### Foundation rules

- 명도 계단은 항상 배경 → 카드 → 중첩 → 시트 순서다. 한 화면에서 이 순서를 건너뛰지 않는다. 카드 위에 다시 카드를 올려야 하면 surface-alt를 쓰고, 그 위는 보더로만 나눈다.

- 색은 하드코딩하지 않는다. 반드시 `useColors()`에서 가져온다. `backgroundColor: c.surface` (O) / `backgroundColor: '#21272F'` (X).

- 다크 모드에서 `shadowOpacity`를 쓰지 않는다. 계층 분리는 surface 토큰의 명도 차이 또는 `border.hairline` + `color.dark.border`로 만든다. 그림자는 라이트 모드에서만 허용한다.

- `text-muted`는 단위·힌트 전용이다. 라이트 테마에서 `color.light.text-muted`(#9AA6B4)는 카드 위 대비 2.47:1로 본문 기준에 미달하므로, 사용자가 반드시 읽어야 하는 정보에는 `text-secondary` 이상을 쓴다.

- 의미색을 본문 크기 텍스트 색으로 쓰지 않는다. 라이트 테마의 흰 카드 위 실측 대비는 danger 3.19:1, success 3.32:1, warning 2.48:1, primary 4.18:1로 모두 4.5:1에 못 미친다. 값 자체는 `text-primary`로 쓰고 의미색은 아이콘·보더·배지 배경 같은 비텍스트 요소에 싣는다.

- 탭 가능한 요소의 히트 영역은 `target.min` 미만이 될 수 없다. 아이콘이 작으면 `hitSlop`으로 채운다.

- 동시에 쓰는 강조색은 한 화면에 2개까지다. 세 번째 의미는 굵기·위치·아이콘으로 구분한다.

- `prefers-reduced-motion`에 해당하는 iOS `Reduce Motion` 설정이 켜져 있으면 위치 이동 애니메이션을 opacity 전환으로 대체한다. 상태 변화 자체를 생략하지는 않는다.
<!-- design-md:claim-end -->

<!-- design-md:section typography-assets -->
## 3. Typography & Assets

### Type roles

| Role | Usage | Family | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|---|
| display | 스크린 타이틀, 통계 대표 수치 | system | 22 | 900 | 1.2 | -0.4 |
| title | 카드 제목, 섹션 헤더, 시트 제목 | system | 17 | 800 | 1.25 | -0.2 |
| numeric | 무게·횟수·칼로리·체중 등 읽고 비교하는 숫자. `fontVariant: ['tabular-nums']` 필수 | system | 15 | 800 | 1.2 | 0 |
| body | 리스트 행 기본 텍스트, 운동명, 음식명 | system | 14 | 600 | 1.4 | 0 |
| body-strong | 리스트 행 안에서 강조되는 값이나 선택된 항목 | system | 14 | 800 | 1.4 | 0 |
| caption | 보조 설명, 날짜, 세트 요약 | system | 12 | 600 | 1.35 | 0 |
| micro | 태그, 단위(kg·회·kcal), 축 라벨 | system | 11 | 700 | 1.3 | 0.2 |

### Assets

| Asset | Kind | Source status | License status | Source | Notes |
|---|---|---|---|---|---|
| system-ui-face | font | official | not-required | iOS 시스템 서체 (React Native 기본 `System`) | 저장소 어디에도 `fontFamily` 지정이 없다. 커스텀 서체를 번들하지 않으므로 별도 라이선스가 필요 없고, Dynamic Type과 한글 자소 렌더링을 시스템에 맡긴다. |

### Rules

- 역할은 위 7개가 전부다. 새 크기를 만들기 전에 굵기(600 → 800 → 900)로 층이 갈리는지 먼저 확인한다.

- 숫자는 항상 `numeric` 또는 `body-strong`이며 `fontVariant: ['tabular-nums']`를 붙인다. 세트 행이 스크롤될 때 자릿수가 흔들리지 않아야 한다.

- 단위(kg, 회, kcal)는 값과 다른 역할로 분리한다. 값은 `numeric`, 단위는 `micro` + `text-muted`, 둘 사이 간격은 `space.2`.

- 한 카드 안에서 `title`은 한 번만 쓴다. 두 번째 제목이 필요하면 그 카드는 두 개로 나눠야 하는 카드다.

- 말줄임은 운동명·음식명 같은 사용자 입력 문자열에만 쓴다(`numberOfLines={1}`). 숫자와 단위는 절대 자르지 않는다.

<!-- design-md:section components-states -->
## 4. Components & States

### Component: button

**Semantics:** 화면의 결정을 실행한다. primary는 한 화면에 하나. 파괴적 액션은 danger 변형과 확인 다이얼로그를 함께 쓴다.

- Anatomy: 컨테이너(radius.pill), 라벨(body-strong), 선택적 좌측 아이콘
- Variants: primary, secondary, ghost, danger
- States: default, focus-visible, pressed, disabled, loading, success
- Token references: radius.pill, color.dark.primary, color.dark.on-accent, space.16, opacity.pressed, opacity.disabled, target.min, duration.press

- Interaction kind: interactive

#### State applicability

| State | Applicability | Reason |
|---|---|---|
| default | applicable |  |
| hover | not-applicable | iOS 터치 전용 서피스라 hover 입력이 없다. |
| focus-visible | applicable |  |
| disabled | applicable |  |
| loading | applicable |  |
| error | not-applicable | 오류는 버튼이 아니라 대상 필드나 화면 수준 배너가 표시한다. |
| success | applicable |  |

### Component: card

**Semantics:** 한 가지 주제의 정보를 묶는다. 카드 사이 간격은 부모의 `gap`으로만 만들고 카드마다 `marginBottom`을 붙이지 않는다.

- Anatomy: 컨테이너(surface, radius.card, padding space.16), 선택적 헤더(title), 본문 슬롯
- Variants: plain, nested, sheet
- States: default, focus-visible, pressed, selected, loading, error
- Token references: color.dark.surface, color.dark.surface-alt, color.dark.border, radius.card, space.16, space.12, border.hairline

- Interaction kind: interactive

#### State applicability

| State | Applicability | Reason |
|---|---|---|
| default | applicable |  |
| hover | not-applicable | iOS 터치 전용 서피스라 hover 입력이 없다. |
| focus-visible | applicable |  |
| disabled | not-applicable | 카드는 비활성화하지 않는다. 내용이 없으면 빈 상태 문구를 대신 보여준다. |
| loading | applicable |  |
| error | applicable |  |
| success | not-applicable | 성공은 카드 컨테이너가 아니라 내부의 값·아이콘 변화로 표현한다. |

### Component: list-row

**Semantics:** 밀도의 기본 단위. 세트, 음식, 운동 항목이 모두 이 행을 쓴다. 세로 패딩 `space.12`, 행 사이 `space.8`을 넘기지 않는다.

- Anatomy: 좌측 식별자(세트 번호 또는 아이콘), 주 텍스트(body), 우측 수치 슬롯(numeric + micro 단위), 선택적 스와이프 액션
- Variants: static, editable, swipeable, draggable
- States: default, focus-visible, pressed, selected, completed, error, disabled
- Token references: space.12, space.8, color.dark.surface-alt, color.dark.text-secondary, color.dark.success, color.dark.danger, target.min, duration.row

- Interaction kind: interactive

#### State applicability

| State | Applicability | Reason |
|---|---|---|
| default | applicable |  |
| hover | not-applicable | iOS 터치 전용 서피스라 hover 입력이 없다. |
| focus-visible | applicable |  |
| disabled | applicable |  |
| loading | not-applicable | 행 단위 로딩은 표시하지 않는다. 로딩은 부모 리스트가 스켈레톤으로 대신한다. |
| error | applicable |  |
| success | not-applicable | 완료 표시는 completed 상태가 담당한다. 별도 success 상태를 두지 않는다. |

### Component: input

**Semantics:** 숫자 입력이 기본 형태다. 포커스는 `primary` 1px 보더로만 표시하고 배경을 바꾸지 않는다.

- Anatomy: 컨테이너(surface-alt, radius.control), 값(numeric 또는 body), 선택적 단위 접미(micro), 선택적 스테퍼
- Variants: text, numeric, stepper
- States: default, focus-visible, focused, filled, error, disabled
- Token references: color.dark.surface-alt, radius.control, space.12, color.dark.primary, color.dark.danger, opacity.disabled, target.min

- Interaction kind: interactive

#### State applicability

| State | Applicability | Reason |
|---|---|---|
| default | applicable |  |
| hover | not-applicable | iOS 터치 전용 서피스라 hover 입력이 없다. |
| focus-visible | applicable |  |
| disabled | applicable |  |
| loading | not-applicable | 입력 필드 자체는 비동기 로드를 갖지 않는다. 로딩은 저장 버튼이 표시한다. |
| error | applicable |  |
| success | not-applicable | 성공 상태는 필드가 아니라 저장 결과 토스트가 알린다. |

### Component: tag

**Semantics:** 부위·카테고리·상태를 한 단어로 표시한다. 태그는 정보이지 액션이 아니며, 탭 가능한 경우에만 선택 상태를 갖는다.

- Anatomy: 컨테이너(radius.chip), 라벨(micro)
- Variants: neutral, part, accent, danger
- States: default, focus-visible, selected, disabled
- Token references: radius.chip, space.10, color.dark.surface-high, color.dark.text-secondary, color.dark.primary

- Interaction kind: interactive

#### State applicability

| State | Applicability | Reason |
|---|---|---|
| default | applicable |  |
| hover | not-applicable | iOS 터치 전용 서피스라 hover 입력이 없다. |
| focus-visible | applicable |  |
| disabled | applicable |  |
| loading | not-applicable | 태그는 즉시 렌더되는 정적 라벨이다. |
| error | not-applicable | 태그는 오류를 표현하지 않는다. danger 변형은 상태 분류이지 오류 상태가 아니다. |
| success | not-applicable | 완료 표시는 list-row의 completed 상태가 담당한다. |

### Component: progress-bar

**Semantics:** 목표 대비 현재 값을 보여준다. 색만으로 초과를 알리지 않고 수치 라벨을 함께 둔다.

- Anatomy: 트랙(surface-high, radius.pill), 채움(primary 또는 의미색, radius.pill), 선택적 수치 라벨(micro)
- Variants: primary, macro, goal
- States: default, complete, over
- Token references: radius.pill, color.dark.surface-high, color.dark.primary, color.dark.success, color.dark.warning

- Interaction kind: non-interactive
- Interaction reason: 진행 바는 표시 전용이며 탭·드래그 입력을 받지 않는다. 값 변경은 별도의 input 컴포넌트가 담당한다.

### Rules

- `TouchableOpacity`에는 항상 `activeOpacity={0.7}`(= `opacity.pressed`)을 명시한다. 기본값 0.2는 다크 배경에서 눌린 느낌이 남지 않는다.

- 누른 상태는 opacity만으로 끝내지 않는다. 리스트 행은 배경을 한 계단 올리고(surface → surface-alt), 버튼은 opacity로 처리한다.

- 스와이프 액션은 파괴적 액션에만 쓰고, 임계값을 넘기 전까지 `danger` 배경과 아이콘·라벨을 함께 노출한다. 임계값 미달 시 `duration.row`로 원위치한다.

- 삭제·초기화 같은 파괴적 액션은 `danger` 색과 확인 다이얼로그를 함께 쓴다. 둘 중 하나만 쓰지 않는다.

- 비활성 상태는 `opacity.disabled`와 `disabled` prop을 항상 같이 준다. 시각만 흐리게 하고 탭이 먹는 상태를 만들지 않는다.

- 아이콘 단독 버튼에는 `accessibilityLabel`이 필수다.

- 새 컴포넌트를 만들기 전에 `components/ui/`의 기존 컴포넌트를 먼저 확인한다.

<!-- design-md:section layout-platforms -->
## 5. Layout & Platforms

### Responsive constraints

- Minimum supported width: 320px
- Reflow target: 200% zoom

### Layout rules

- 스크린 좌우 여백은 부모 컨테이너의 `paddingHorizontal`로 한 번만 준다. 카드마다 `marginHorizontal`을 붙이지 않는다.

- 세로 간격은 부모의 `gap`으로 만든다. 자식마다 `marginBottom`을 지정하지 않는다.

- 밀도 계단: 카드 사이 `space.12`, 섹션 사이 `space.24`, 카드 내부 패딩 `space.16`, 카드 안 행 사이 `space.8`.

- 배치는 flex 우선이다. absolute는 오버레이, 툴팁, 플로팅 액션에만 쓴다.

- 긴 리스트는 `FlatList`를 쓰고 `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`를 명시한다.

- `ScrollView` 안에 드래그 정렬 리스트를 중첩하지 않는다. 자동 스크롤이 충돌한다.

### Platform: ios

- 세이프 에어리어는 `useSafeAreaInsets()`로 계산한다. `bottom: 88` 같은 고정값을 쓰지 않는다.
- 웹 개념을 그대로 옮기지 않는다. 미디어 쿼리 대신 `Dimensions` + `Platform.OS`, `aria-*` 대신 `accessibilityLabel`/`accessibilityRole`을 쓴다.
- `elevation`은 iOS에서 무시된다. 깊이 확인은 iOS 실기기 기준으로 한다.
- 키보드 대응은 `KeyboardAvoidingView` 하나로 처리한다. 수동 `scrollTo`와 병행하면 충돌한다.
- worklet 안에서 JS 함수를 직접 호출하지 않는다. `runOnJS`로 감싼다.
- 제스처·키보드·애니메이션은 시뮬레이터 통과와 별개로 실기기에서 확인한다.

<!-- design-md:section content-locales -->
## 6. Content & Locales

### Voice

- 숙련자에게 말한다. '운동을 시작해볼까요?' 대신 '운동 시작'. 설명 문장보다 라벨을 먼저 고른다.

- 액션 라벨은 동사 두 글자에서 다섯 글자 사이의 명령형이다: 저장, 삭제, 추가, 이어하기, 다시 시도.

- 오류는 무엇이 실패했는지와 다음에 무엇을 할지를 한 문장씩 준다: '저장 실패' + '다시 시도해주세요'.

- 숫자를 문장으로 풀어쓰지 않는다. '총 12세트를 완료하셨습니다'가 아니라 '12세트 완료'.

- 사용자를 칭찬하거나 동기부여 문구를 넣지 않는다. 기록 도구는 평가하지 않는다.

### Terminology

| Term | Preferred form |
|---|---|
| 루틴 | 루틴 (저장된 운동 묶음. '프로그램'과 혼용하지 않는다) |
| 무게 | 무게 (kg 단위 병기) |
| 볼륨 | 볼륨 (무게 × 횟수 × 세트 합계) |
| 부위 | 부위 (가슴, 등, 하체, 어깨, 이두, 삼두, 복근 등) |
| 세트 | 세트 (set의 번역어로 '셋'을 쓰지 않는다) |
| 횟수 | 횟수 (reps. '렙'은 UI 라벨에 쓰지 않는다) |

### Locale: ko (supported)

- UI 기본 언어다. 조사는 앞 글자에 맞춰 미리 확정한 문자열로 쓰고 런타임에서 조합하지 않는다.
- 숫자와 단위 사이는 붙여 쓴다: `12회`, `60kg`, `320kcal`.
- 한글은 라틴 문자보다 세로로 크게 읽히므로 `line_height`를 1.2 아래로 내리지 않는다.

<!-- design-md:section governance -->
## 7. Governance

<!-- design-md:claim authority kind=project-system lang=en -->
### Authority

This document is the project design contract for the declared scope.
<!-- design-md:claim-end -->

<!-- design-md:claim application-priority order=prompt-fact,repository-fact,system-contract,reference-inspiration lang=en -->
### Application priority

1. Direct user instructions for the requested scope.
2. Repository facts.
3. This system contract.
4. Reference inspiration.
<!-- design-md:claim-end -->

<!-- design-md:claim unknowns policy=absent-at-smallest-unresolved-boundary lang=en -->
### Unknowns

Omit only the smallest unresolved value or group. Do not replace it with a plausible default.
<!-- design-md:claim-end -->

<!-- design-md:claim changes policy=review-record-validate-before-adoption lang=en -->
### Changes

Record, review, and validate changes before adoption.
<!-- design-md:claim-end -->

### Project priority details

1. 이 문서는 Harulog iOS 앱의 제품 UI에만 적용된다.

2. `mobile/CLAUDE.md`의 작업 규칙과 충돌하면 CLAUDE.md가 아니라 이 문서를 갱신해 둘을 일치시킨다.

3. 레퍼런스(Spotify)는 다크 계층·밀도·여백·타이포 위계·인터랙션 피드백 다섯 축의 참고일 뿐이며, 색·서체·컴포넌트 값의 근거가 아니다.

### Additional change rules

- 색 토큰 변경은 `mobile/constants/colors.ts`와 이 문서를 같은 커밋에서 함께 바꾼다.

- 타입 역할을 추가하려면 기존 7개 역할로 해결되지 않는 이유를 먼저 적는다.

- 대비 미달로 기록된 항목(라이트 `text-muted`, 라이트 의미색)은 해결 시 이 문서의 규칙과 `contrast_pairs`를 함께 갱신한다.

### Decision provenance

- /foundations/tokens/color.dark.primary — repository-fact; evidence: constants/colors.ts
- /foundations/tokens/color.light.primary — repository-fact; evidence: constants/colors.ts
- /typography_assets/roles — agent-proposed-greenfield-decision; evidence: CLAUDE.md#3. 폰트/텍스트 위계, .claude/data/references/spotify/DESIGN.md#Captured player hierarchy
- /foundations/tokens/duration.sheet — agent-proposed-greenfield-decision; evidence: .claude/data/references/spotify/DESIGN.md#15. Motion & Easing, .omd/init-context.json#delta_set.warnings
- /foundations/contrast_pairs — agent-proposed-greenfield-decision; evidence: constants/colors.ts
- /experience/brand-thesis — unresolved; evidence: .omd/init-context.json#description
- /experience/tagline — unresolved; evidence: .omd/init-context.json#description
- /foundations/tokens/color.dark.focus-ring — unresolved; evidence: constants/colors.ts
- /foundations/tokens/shadow.light — unresolved; evidence: CLAUDE.md#4. 그림자와 시각적 계층
