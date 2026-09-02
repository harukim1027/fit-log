# Harulog
> AI-era 풀스택 개발자가 만든 React Native 피트니스 트래커

## 📱 서비스 소개
- 운동 기록, 루틴 관리, 히스토리 분석
- TestFlight 배포 완료
- 실사용자 피드백 기반 지속 개선 중

## 🏗 시스템 아키텍처
```
[Client Layer]
  iOS App (Expo/React Native)
       ↓ HTTPS
[Server Layer]  
  NestJS REST API (Railway)
       ↓
[Data Layer]
  PostgreSQL (Railway)

[External Services]
  Google OAuth → JWT 인증
  Expo Notifications → 푸시 알림
  Sentry → 에러 모니터링
  SecureStore → 토큰 저장
```

## 🛠 기술 스택
### Frontend (Mobile)
- React Native + Expo SDK 54
- TypeScript
- Zustand (전역 상태관리)
- NativeWind v4 (스타일링)
- Expo Router (파일 기반 라우팅)
- expo-secure-store (토큰 보안 저장)
- expo-notifications (푸시 알림)
- Sentry (에러 모니터링)

### Backend
- NestJS + TypeScript
- TypeORM + PostgreSQL
- JWT (AccessToken + RefreshToken)
- Passport.js
- Railway (배포)

### DevOps / Tools
- GitHub Actions (CI/CD)
- EAS Build (iOS 빌드/배포)
- TestFlight (베타 배포)
- CodeRabbit (AI 코드리뷰)

## 📊 DB 설계 (ERD)
```
users
├── id (PK)
├── email
├── name
├── weight
├── height
└── isOnboardingDone

workout_sessions
├── id (PK)
├── userId (FK → users)
├── date
├── durationMinutes
├── caloriesBurned
└── fromRoutineId (FK → routines)

workout_exercises
├── id (PK)
├── sessionId (FK → workout_sessions)
├── name
├── category
├── targetMuscles
├── restSeconds
├── order
└── isSingleArm

workout_sets
├── id (PK)
├── exerciseId (FK → workout_exercises)
├── weight
├── reps
├── unit (kg/lbs)
├── completed
└── order

routines
├── id (PK)
├── userId (FK → users)
├── name
├── isPublic
└── shareCode

routine_exercises
├── id (PK)
├── routineId (FK → routines)
├── name
├── category
├── defaultSets
├── defaultWeight
├── defaultReps
├── defaultUnit
├── restSeconds
└── order
```

## 🔐 인증 플로우
```
[앱 시작]
    ↓
SecureStore에서 토큰 조회
    ↓
토큰 있음 → /users/me 호출
    ↓
200 OK → 앱 진입
401 Unauthorized → /auth/refresh 호출
    ↓
refresh 성공 → 새 토큰 저장 → 앱 진입
refresh 실패 → 로그인 화면
```

## 📡 API 설계
### 인증
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- POST /api/auth/refresh

### 운동
- GET /api/workout
- POST /api/workout
- GET /api/workout/:date
- PATCH /api/workout/:id
- DELETE /api/workout/:id
- GET /api/workout/exercise-history

### 루틴
- GET /api/routine
- POST /api/routine
- PATCH /api/routine/:id
- DELETE /api/routine/:id
- POST /api/routine/reorder
- GET /api/routine/explore
- POST /api/routine/:id/share
- GET /api/routine/code/:shareCode
- POST /api/routine/:id/copy

### 운동 종목
- GET /api/exercise/list
- GET /api/exercise/search
- GET /api/exercise/bodypart
- POST /api/exercise/custom

## ⚡ 성능 최적화
- Zustand selector로 불필요한 리렌더링 방지
- useMemo로 무거운 계산 메모이제이션
- React.memo로 리스트 아이템 최적화
- API 호출 디바운스 (루틴 자동저장)
- JWT 만료 3일 전 사전 갱신

## 🔄 CI/CD 파이프라인
```
Git Push → GitHub Actions
    ↓
백엔드: Railway 자동 배포
    ↓
프론트: EAS Build (수동)
    → TestFlight 업로드
    → OTA 업데이트 (코드 변경만)
```

> 배포 전에 반드시 해소해야 하는 항목은 [`DEPLOY-BLOCKERS.md`](./DEPLOY-BLOCKERS.md)에 있다.
> **현재 미해소 0건.**
>
> 스키마 변경은 마이그레이션으로만 한다. `synchronize`는 꺼져 있고, 배포 시
> `startCommand`가 기동 전에 `migration:run`을 돌린다. 절차는 위 문서의
> "스키마를 바꾸는 방법".

## 🛡 에러 처리 전략
- Sentry 에러 모니터링 (프로덕션)
- 전역 ErrorBoundary (앱 크래시 방지)
- API 인터셉터 (401 자동 갱신, 5xx Sentry 전송)
- 운동 중 앱 종료 시 AsyncStorage 임시저장
- 운동 중 401 발생 시 로그아웃 방지

## 📈 향후 개선 계획
- [ ] Apple Watch 연동
- [ ] 운동 통계 고도화 (주간/월간 리포트)
- [ ] 소셜 기능 (친구 운동 공유)
- [ ] AI 운동 추천

## 🧭 Phase 2 네비게이션 재설계

프로필·목표 관련 진입점이 흩어져 있고 항목이 중복되어, 설정 화면으로 통합하고
모달을 스택으로 전환하기 위한 사전 조사 결과다.

### 현재 라우트 구조

모달 7개가 전부 `presentation: "fullScreenModal"` + `animation: "slide_from_bottom"`으로
`app/_layout.tsx`에 선언돼 있다.

| 경로 | 진입 경로 | 닫기 |
|---|---|---|
| `modal/edit-profile` | 홈 우상단 아바타, 통계 헤더 person | 자체 헤더 X |
| `modal/routine-manage` | 홈, 운동 탭 | Header showClose |
| `modal/add-workout` | 운동 탭 | ExerciseAdder Header showClose |
| `modal/full-calendar` | 운동 탭 | 자체 헤더 X |
| `modal/add-food` | `diet.tsx` (도달 불가) | Header showClose |
| `modal/barcode-scan` | add-food 헤더 | Header showClose |

`gestureEnabled`는 어디에도 설정돼 있지 않다. `fullScreenModal`은 스와이프 dismiss가
비활성이므로 **현재 닫는 수단은 사실상 X 버튼 하나뿐**이다(+ Android 하드웨어 뒤로가기).

식단 탭은 `(tabs)/_layout.tsx`에서 `href: null`로 숨겨져 있고 파일은 보존돼 있다.
따라서 `add-food` / `barcode-scan`은 라우트는 살아 있으나 진입점이 없다.

### 미저장 가드 전무

`beforeRemove` / `usePreventRemove` / `BackHandler` / dirty 체크가 **레포 전체에 0건**이다.
유일한 확인 다이얼로그는 `workout.tsx`의 운동 세션 종료("저장하지 않고 종료")인데,
이건 라우트 이탈이 아니라 세션 종료다.

현재는 X가 "취소"로 읽히고 실제 동작도 폐기라서 일관되다. 문제는 다음 항목이다.

### 스택 전환 시 스와이프가 자동 활성화된다

`card` presentation은 iOS에서 뒤로가기 스와이프가 기본 활성이다. 즉 전환하는 순간
7개 화면 전부에 **새 이탈 경로가 생긴다**. 지금까지 "의도적 폐기"였던 동작이
스와이프 오조작으로 바뀌므로, 작성 중 내용이 사고로 사라진다.

위험도가 높은 순서:
1. `routine-manage` create — 루틴명 + 종목 N개가 확인 없이 폐기
2. `ExerciseAdder` — 종목·세트·설정
3. `edit-profile`, `add-food`

### routine-manage 1199줄 내부 상태머신

다단계 흐름이 라우트 체인이 아니라 **단일 라우트 안의 상태머신**이다.

```
routine-manage (라우트 1개)
├─ mode: "list"            Header showClose → router.back()   ← 유일한 진짜 이탈
├─ mode: "create"/"edit"   Header showClose → setMode("list")
│   └─ subMode: "addExercise"/"editExercise" → <ExerciseAdder onClose={setSubMode} />
├─ mode: "combine-select"  Header showClose → setMode("list")
└─ mode: "combine-edit"    Header showClose → setMode("combine-select")
```

"루틴 관리 → 새 루틴 → 종목 추가" 3단계가 라우트 1개다. X 버튼 4개 중 3개는 내부
모드를 되돌릴 뿐이다. 스택으로 전환하면서 이 화면을 쪼개지 않으면, 스와이프가
"새 루틴 작성 중"에도 루틴 관리 전체를 닫아버린다.

### 작업 순서

1. **set-target 정리** — 완료 (`refactor/remove-set-target`)
2. **설정 탭 신설** — 흩어진 설정성 항목 통합
3. **미저장 가드** — dirty 체크 + 이탈 확인 다이얼로그
4. **스택 전환** — `fullScreenModal` → `card`, showClose → showBack

**3번이 4번보다 먼저여야 하는 이유**: 4번은 그 자체로 새로운 데이터 소실 경로를
만든다. 스와이프는 X 버튼과 달리 오조작이 쉽고 되돌릴 수 없다. 가드가 없는 상태에서
스택으로 먼저 전환하면, 가드를 붙이기 전까지의 기간 동안 사용자가 작성 중이던
루틴·운동 기록을 실제로 잃는다. 순서를 뒤집으면 회귀가 아니라 신규 결함을 배포하는 셈이다.

### 설정 화면으로 옮길 항목

| 항목 | 현재 위치 |
|---|---|
| 이름 · 성별 · 나이 · 신장 · 체중 | edit-profile |
| 목표 · 주간 운동 목표 | edit-profile |
| 무게 단위 · 부위 선택기 · 휴식 알림 | edit-profile (settingsStore) |
| 테마 | 홈 헤더 + 통계 헤더 **2곳 중복** |
| 로그아웃 | 통계 헤더 |
| 계정(이메일·비번변경·탈퇴) | **없음 — 신설 후보** |

### 알려진 불일치 — 홈의 주 범위와 "최근 기록"

홈 주간 캘린더에 좌우 주 이동이 생기면서(`feat/home-calendar-week-nav`) 기존에
있던 어긋남이 더 드러난다.

`selectedDate`가 표시 중인 주를 결정하고, 상단 3개 섹션은 이 값을 따라간다.

| 섹션 | `selectedDate` 의존 |
|---|---|
| 주간 스트립 · 헤더 주 범위 | ✅ |
| "이번 주 운동 N/4" | ✅ |
| PR 배지 | ✅ |
| "이번 주 자극 부위 N/6" | ✅ |
| **"최근 기록"** | ❌ `[sessions, activeSession, filter]` |

즉 지난주로 이동하면 위 3개는 그 주 기준으로 바뀌지만 **"최근 기록"은 전체에서
최신 6개를 그대로 보여준다.** 부위 칩으로만 걸러진다.

주 이동이 없던 시절에는 `selectedDate`가 사실상 오늘 고정이라 눈에 띄지 않았다.
이제는 8월 초로 이동해도 "최근 기록"에 이번 주 세션이 뜬다.

- 섹션 제목의 "이번 주"라는 표현도 표시 중인 주를 가리키게 바뀌어야 한다.
- 처리 시점: **Phase 2 홈 재설계**. 이번 작업 범위에서는 `recentSessions` 로직을
  건드리지 않았다.

## 🚀 로컬 실행
```bash
# 백엔드
cd api
npm install
npm run start:dev

# 프론트
cd mobile
npm install
npx expo start
```

## 📁 프로젝트 구조
```
fitlog-mono/
├── api/                    # NestJS 백엔드
│   ├── src/
│   │   ├── auth/          # JWT 인증
│   │   ├── workout/       # 운동 CRUD
│   │   ├── routine/       # 루틴 관리
│   │   ├── exercise/      # 운동 종목
│   │   └── users/         # 유저 관리
│   └── ...
└── mobile/                 # Expo React Native
    ├── app/               # Expo Router 페이지
    │   ├── (tabs)/        # 탭 화면
    │   └── modal/         # 모달 화면
    ├── components/        # 재사용 컴포넌트
    ├── store/             # Zustand 상태관리
    ├── hooks/             # 커스텀 훅
    ├── lib/               # API 클라이언트, 유틸
    └── utils/             # 순수 유틸 함수
```
