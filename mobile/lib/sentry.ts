/**
 * @file lib/sentry.ts
 * @description Sentry 에러 모니터링 초기화 및 사용자 연동
 *
 * 왜 별도 파일로 분리했나:
 * - setSentryUser/clearSentryUser는 authStore에서 호출해야 한다.
 * - authStore → _layout.tsx 방향의 의존은 순환 참조를 유발하므로
 *   lib/ 계층에 분리해 authStore에서 안전하게 임포트할 수 있게 했다.
 */

import * as Sentry from '@sentry/react-native';

/**
 * 앱 시작 시 한 번 호출한다 (_layout.tsx 모듈 레벨에서 호출).
 * 프로덕션에서만 활성화되므로 개발 중 Sentry 이벤트가 유입되지 않는다.
 */
export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV ?? 'development',

    // 전체 트랜잭션의 20%만 성능 추적 — 서버 비용과 트래킹 유용성의 균형
    tracesSampleRate: 0.2,

    beforeSend(event) {
      // 4xx 에러는 예상된 클라이언트 오류 (인증 만료, 잘못된 입력 등) — 수집 불필요
      const statusCode = event.tags?.status_code;
      if (typeof statusCode === 'number' && statusCode < 500) return null;
      // 네트워크 없음은 사용자 환경 문제 — 코드 버그가 아님
      const type = event.exception?.values?.[0]?.type;
      if (type === 'NetworkError' || type === 'AbortError') return null;
      return event;
    },
  });
}

/**
 * 로그인 성공 후 호출해 에러 리포트에 사용자 정보를 연결한다.
 * 덕분에 Sentry 대시보드에서 "어떤 사용자에게 어떤 에러가 발생했는지" 추적 가능.
 */
export function setSentryUser(user: { id: number; email: string }) {
  Sentry.setUser({ id: String(user.id), email: user.email });
}

/** 로그아웃 시 호출 — 이후 에러가 이전 사용자에게 귀속되는 것을 방지 */
export function clearSentryUser() {
  Sentry.setUser(null);
}
