/**
 * @file constants/api.ts
 * @description API 베이스 URL. 빌드 시점에 EXPO_PUBLIC_API_URL 이 코드에 박힌다.
 *
 * ── 프로덕션에서 폴백을 두지 않는 이유 ─────────────────────────────────────
 * 전에는 값이 없으면 경고만 찍고 `http://localhost:3000/api` 로 떨어졌다.
 * 배포된 앱에서 그 폴백이 걸리면 **모든 요청이 조용히 실패한다.** 로그인도
 * 안 되는데 화면에는 네트워크 오류만 뜨고, 원인이 "빌드에 환경변수가 안
 * 들어갔다"라는 건 앱 안에서 알아낼 방법이 없다.
 *
 * 실제로 그럴 뻔했다. CI 워크플로가 eas.json 을 통째로 새로 만들면서 환경변수
 * 블록을 날리고 있었다(DEPLOY-BLOCKERS.md 항목 3). 조용히 localhost 로 나가느니
 * 즉시 죽는 편이 낫다.
 *
 * `__DEV__` 는 Metro 가 번들 시점에 상수로 치환한다. 릴리스 빌드에서는 false 라
 * 이 throw 가 살아 있고, 개발 중에는 로컬 서버로 폴백한다.
 */

const LOCAL_FALLBACK = 'http://localhost:3000/api';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  if (!__DEV__) {
    throw new Error(
      '[api] EXPO_PUBLIC_API_URL 이 빌드에 주입되지 않았습니다. ' +
        'EAS 서버 환경변수(production)에 등록돼 있는지, eas.json 의 production ' +
        '프로필에 "environment": "production" 이 있는지 확인하세요. ' +
        'DEPLOY-BLOCKERS.md 항목 3 참조.',
    );
  }

  console.warn(`[api] EXPO_PUBLIC_API_URL 미설정 — ${LOCAL_FALLBACK} 사용 (개발 전용)`);
  return LOCAL_FALLBACK;
}

export const API_URL = resolveApiUrl();
