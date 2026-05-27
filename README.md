# FitLog

식단과 운동을 함께 기록하는 통합 트래커 앱. 모노레포 구조로 모바일 앱과 백엔드 API를 한 저장소에서 관리합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모바일 | Expo, React Native, TypeScript |
| 상태관리 | Zustand |
| 라우팅 | Expo Router (파일 기반) |
| 백엔드 | NestJS, TypeScript |
| 데이터베이스 | PostgreSQL + TypeORM |
| 인증 | JWT |
| 외부 API | Open Food Facts (식품 DB) |

---

## 프로젝트 구조

```
fitlog-mono/
├── mobile/   ← Expo (React Native) 앱
└── api/      ← NestJS 백엔드
```

### mobile/

```
mobile/
├── app/                     ← Expo Router 파일 기반 라우팅
│   ├── _layout.tsx          ← 루트 레이아웃 (인증 분기)
│   ├── (tabs)/              ← 하단 탭 네비게이션
│   │   ├── index.tsx        ← 홈 (대시보드)
│   │   ├── diet.tsx         ← 식단 탭
│   │   ├── workout.tsx      ← 운동 탭
│   │   └── stats.tsx        ← 통계 탭
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── modal/
│       ├── add-food.tsx     ← 음식 추가
│       ├── add-workout.tsx  ← 운동 추가
│       ├── barcode-scan.tsx ← 바코드 스캔
│       └── set-target.tsx   ← 목표 칼로리 설정
├── components/              ← 공용 컴포넌트
│   ├── CalorieRing.tsx      ← 도넛 링 칼로리 차트
│   ├── KeyboardToolbar.tsx  ← 키보드 닫기 툴바
│   ├── RestTimer.tsx        ← 운동 휴식 타이머
│   └── WaterTracker.tsx     ← 물 섭취 추적
├── store/                   ← Zustand 전역 상태
│   ├── authStore.ts
│   ├── dietStore.ts
│   ├── favoriteStore.ts
│   ├── waterStore.ts
│   └── workoutStore.ts
├── lib/
│   └── apiClient.ts         ← axios 클라이언트 (JWT 자동 첨부)
├── constants/
│   ├── api.ts               ← API 베이스 URL
│   └── colors.ts            ← 테마 색상
└── types/
    ├── diet.ts
    └── workout.ts
```

### api/

NestJS 도메인 모듈 구조입니다.

```
api/src/
├── auth/       ← JWT 로그인·회원가입, Guard, Strategy
├── users/      ← 유저 엔티티 및 CRUD
├── food/       ← Open Food Facts API 연동, 식품 검색
├── diet/       ← 식단 로그 기록 및 조회
├── water/      ← 물 섭취 로그
├── workout/    ← 운동 세션·세트·종목 기록 (3개 엔티티)
├── favorite/   ← 즐겨찾기 음식
└── stats/      ← 날짜별 통계 집계
```

---

## 시작하기

### 백엔드 (api/)

```bash
cd api
npm install
npm run start:dev
```

### 모바일 (mobile/)

```bash
cd mobile
npm install
npx expo start
```
