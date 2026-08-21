# Harulog Mobile - Claude Code 작업 지침

이 프로젝트는 React Native + Expo + NativeWind로 만든 
운동 기록 iOS 앱입니다. UI 작업 시 아래 규칙을 반드시 따르세요.

## 프로젝트 컨텍스트

- **스택**: React Native, Expo SDK 54, TypeScript, NativeWind v4, Zustand, Expo Router
- **테마**: 다크 모드 기본. 라이트 모드 병행 지원
- **디자인 톤**: 다크 배경 + 파란색(#2E82F0) 강조. 헬스인 대상 도구, 감각적이되 정보 밀도 높음
- **타겟**: 웨이트 트레이닝 숙련자 (기입 정보 많음, 정보 밀도 중요)

## UI 작업 규칙

### 1. 색상 시스템
- 하드코딩 금지. 반드시 `useColors()` 훅에서 가져와 사용.
- 예: `backgroundColor: c.surface` (O), `backgroundColor: '#21272F'` (X)
- 다크/라이트 자동 대응 필요.

### 2. 여백과 정렬
- 카드 사이 세로 간격: `gap` prop 사용. `marginBottom` 각각 지정 금지.
- 카드 내부 padding: 통일된 값 (일반적으로 16). 
- 좌우 여백: 부모 컨테이너에 `paddingHorizontal` 통일. 카드마다 개별 marginHorizontal 지정 금지.
- 정렬은 flex 우선. absolute 위치는 오버레이/tooltip 등에만 사용.

### 3. 폰트/텍스트 위계
- 제목: fontSize 16~22, fontWeight 800~900
- 본문: fontSize 13~14, fontWeight 500~600
- 부가정보: fontSize 11~12, color textSecondary/textMuted
- 색상은 c.textPrimary / c.textSecondary / c.textMuted 세 단계

### 4. 그림자와 시각적 계층
- 다크 모드에서 그림자는 잘 안 보임. 대신 배경 계층 (surface → surfaceAlt) 또는 borderWidth로 구분.
- 라이트 모드에서만 shadowOpacity 사용.
- elevation(안드로이드)은 iOS에서 무시되므로 iOS 우선 확인.

### 5. 인터랙션 피드백
- TouchableOpacity: activeOpacity 0.7 통일. 지정 안 하면 기본값(0.2)이 너무 흐림.
- 파괴적 액션(삭제 등): c.danger 색상 + 확인 다이얼로그 필수.
- 비활성 상태: opacity 0.5 + disabled prop.

### 6. 접근성
- 아이콘 단독 버튼에는 accessibilityLabel 필수.
- 예: <TouchableOpacity accessibilityLabel="루틴 삭제">
- 색상만으로 정보 전달 금지 (예: 빨간색 = 오류 → 아이콘/텍스트 병행).

### 7. 반응성
- FlatList 사용 시 initialNumToRender, maxToRenderPerBatch 설정.
- 무거운 리스트는 windowSize 조정.
- Zustand 사용 시 selector로 필요한 값만 구독. `const x = useStore(s => s.x)` 형태.
- 매 렌더마다 새 객체/함수 생성하는 인라인 스타일/콜백 최소화.

### 8. React Native 특수사항
- 웹의 aria-* 속성 대신 accessibilityLabel, accessibilityRole 사용.
- CSS media query 대신 Dimensions API + Platform.OS 분기.
- Safe area는 useSafeAreaInsets() 사용. bottom: 88 같은 하드코딩 금지.
- Keyboard 처리 시 KeyboardAvoidingView + 수동 scrollTo 병행 금지 (충돌 유발).

### 9. 컴포넌트 재사용
- 공통 UI는 mobile/components/ui/ 에 배치 후 재사용.
- 새 컴포넌트 만들기 전에 grep으로 유사 컴포넌트 확인.
- 특히 Card, Header, SortableList, SetInputRow 등 기존 것 우선.

### 10. Reanimated / Worklet 주의
- worklet 함수 안에서 JS 함수 직접 호출 금지.
- runOnJS로 감싸서 호출.
- 예: onComplete={({ hex }) => { 'worklet'; runOnJS(setDraftHex)(hex) }}

## 작업 방식 규칙

### 스펙 확인 없이 수정 금지
- 사용자가 "이거 안 됩니다" 라고 하면, 코드만 보고 판단하지 말고 
  실제 렌더 결과(스크린샷, onLayout 로그) 기준으로 확인.
- "이미 되어있습니다"라는 답변 전에 실제 확인 필수.

### 회귀 방지
- 이미 여러 번 요청된 수정이 롤백되면 원인 커밋부터 추적.
- 필수 로직에는 주석으로 회귀 방지 표시:
  `// 회귀 방지: 이 로직은 요청 이력 있음. 지우지 말 것.`

### 색출 후 수정
- "삭제해줘" 요청 시 먼저 grep으로 모든 위치 나열 → 확인 → 삭제.
- 놓친 곳 없도록 여러 파일 동시 확인.

### 실기기 우선
- 시뮬레이터에서 통과해도 실기기에서 다를 수 있음.
- 특히 제스처, 키보드, 애니메이션은 실기기 확인 권장.

## 이 프로젝트에서 하지 말 것

- 웹 관련 개념(DOM, CSS media query, aria-*) 그대로 적용
- 라이브러리 추가 시 Expo SDK 54 호환성 확인 없이 진행
- ScrollView 안에 DraggableFlatList 중첩 (자동 스크롤 충돌)
- API 키를 mobile 번들에 노출 (반드시 NestJS 서버 환경변수로)
- localStorage/sessionStorage 사용 (RN에서 지원 안 함, AsyncStorage/SecureStore 사용)

<!-- omd:start v=1 hash=a0905ab87d60 -->
# Design System (oh-my-design)

Read the standalone design contract at **@./DESIGN.md** before any UI,
styling, microcopy, or motion work. When a valid adopted Core v2
`.omd/system/manifest.json` declares `profile: portable-core` and binds exact
graph/projection hashes, the System Graph is machine authority and DESIGN.md is
its standalone projection. A migration candidate is never adopted authority.

Preference log (pending corrections): @./.omd/preferences.md

Precedence: pending explicit preference corrections > adopted Bound System
graph/standalone DESIGN.md > your defaults. Fold pending corrections into the
graph and regenerate the projection before clearing them.
<!-- omd:end -->
