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
