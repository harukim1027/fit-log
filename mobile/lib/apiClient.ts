/**
 * @file lib/apiClient.ts
 * @description Axios 인스턴스 + 인터셉터 설정
 *
 * 핵심 기능:
 * 1. 요청마다 JWT 자동 첨부
 * 2. 401 응답 시 자동 토큰 갱신 + 실패한 요청 재시도
 * 3. 갱신 중 동시 요청이 들어오면 큐에 대기 (중복 갱신 방지)
 * 4. 5xx 서버 에러 Sentry 자동 보고
 *
 * 401 처리 흐름:
 *   요청 → 401 → 운동 중이면 무시 → refresh 요청 → 성공: 큐 처리
 *                                                   → 실패: 로그아웃
 */

import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { API_URL } from '../constants/api';
import { secureStorage } from './secureStorage';

/** API 에러를 타입 안전하게 처리하기 위한 커스텀 에러 클래스 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiClient = axios.create({ baseURL: API_URL, timeout: 10000 });

/** 모든 요청에 저장된 JWT를 Authorization 헤더로 주입 */
apiClient.interceptors.request.use(async (config) => {
  const token = await secureStorage.getToken();
  if (token) config.headers.Authorization = 'Bearer ' + token;
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params ?? '');
  return config;
});

/**
 * ── 이 파일은 스토어를 import 하지 않는다 ─────────────────────────────────
 *
 * 스토어가 apiClient 를 쓰고 apiClient 가 다시 스토어를 쓰면 순환이 된다.
 * 전에는 `_onUnauthorized` 만 이 방식으로 끊어 두고 나머지 둘은 직접
 * import 해서, Require cycle 경고가 3건 남아 있었다.
 *
 *   store/workoutStore.ts → lib/apiClient.ts → store/workoutStore.ts
 *   lib/apiClient.ts → store/authStore.ts → lib/apiClient.ts
 *   lib/apiClient.ts → store/authStore.ts → store/dietStore.ts → lib/apiClient.ts
 *
 * 지금은 스토어 상태가 필요하면 **호출자가 콜백을 등록한다.** 등록은
 * `app/_layout.tsx` 한 곳에서 하고, 여기서는 등록 안 된 경우를 항상 안전하게
 * 처리한다. 새 의존이 생기면 import 를 추가하지 말고 이 패턴을 따를 것.
 *
 * 모두 `app/_layout.tsx`의 AuthGate 첫 effect 에서 등록된다. 그 effect 는
 * 마운트 이후에 돌므로 **등록 전에 인터셉터가 도는 경우가 원리상 가능하다.**
 * 실제로는 첫 API 호출이 같은 effect 안의 `loadToken()`이고 등록이 그보다
 * 앞서지만, 그 순서에 기대지 않고 각 콜백마다 안전한 기본값을 둔다.
 */

/** 401 이 끝내 해결되지 않았을 때 = 로그아웃. 미등록이면 아무것도 하지 않는다. */
let _onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
};

/**
 * 지금 401 갱신을 미뤄야 하는가(= 운동 세션이 진행 중인가).
 *
 * 미등록 기본값은 **false(미루지 않음)** 다. 이 콜백이 지키려는 건 진행 중인
 * 운동 세션의 데이터인데, 등록 전 시점에는 화면이 아직 없어 그런 세션이
 * 존재할 수 없다. 반대로 true 로 두면 갱신이 통째로 막혀 로그인 직후가 깨진다.
 */
let _shouldDeferAuthRefresh: (() => boolean) | null = null;

export const setDeferAuthRefreshCheck = (check: () => boolean) => {
  _shouldDeferAuthRefresh = check;
};

/**
 * 토큰 갱신 성공을 알린다 — 스토어의 메모리 상태를 맞추기 위한 것이다.
 *
 * 미등록이면 건너뛰어도 된다. 새 토큰은 이 알림 직전에 이미 secureStorage 에
 * 저장되고, 요청 인터셉터는 매번 secureStorage 에서 읽는다. 스토어 쪽 값은
 * `loadToken()`이 채운다.
 */
let _onTokenRefreshed: ((token: string) => void) | null = null;

export const setTokenRefreshedHandler = (handler: (token: string) => void) => {
  _onTokenRefreshed = handler;
};

// 동시에 여러 요청이 401을 받았을 때 refresh를 한 번만 시도하기 위한 플래그와 대기 큐
let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

/** 갱신된 토큰으로 대기 중인 요청들을 일괄 재시도 */
const processRefreshQueue = (token: string) => {
  _refreshQueue.forEach((cb) => cb(token));
  _refreshQueue = [];
};

apiClient.interceptors.response.use(
  (res) => {
    console.log(`[API] ✓ ${res.status} ${res.config.url}`, Array.isArray(res.data) ? `[${res.data.length}]` : '');
    return res;
  },
  async (error) => {
    const status: number = error.response?.status ?? 0;
    const originalRequest = error.config;
    const url: string = originalRequest?.url ?? '';
    const msg: string = error.response?.data?.message
      ?? (error.code === 'ECONNABORTED' ? 'timeout' : error.message ?? '');

    console.error(`[API] ✗ ${status || 'ERR'} ${url} — ${msg}`);

    // 4xx는 클라이언트 로직 오류(예: 인증 만료, 잘못된 입력)이므로 Sentry 불필요
    // 5xx만 서버 이상 신호로 보고
    if (status >= 500) {
      Sentry.captureException(error, {
        tags: { api_url: url, status_code: status },
        extra: { response: error.response?.data },
      });
    }

    if (status !== 401 || !originalRequest) {
      return Promise.reject(new ApiError(status, msg, url));
    }

    // 운동 세션 중 401은 무시하는 이유:
    // 갱신/로그아웃 시 세션 데이터가 유실될 수 있으므로 세션 완료 전까지 현 상태 유지
    if (_shouldDeferAuthRefresh?.()) return Promise.reject(new ApiError(status, msg, url));

    // refresh 엔드포인트 자체가 401이면 토큰이 완전히 만료된 것 → 강제 로그아웃
    if (url.includes('/auth/refresh')) {
      _refreshQueue = [];
      _isRefreshing = false;
      _onUnauthorized?.();
      return Promise.reject(new ApiError(status, msg, url));
    }

    // _retry 플래그: 갱신 후 재시도했는데 또 401이 오면 무한 루프 방지
    if ((originalRequest as any)._retry) {
      _onUnauthorized?.();
      return Promise.reject(new ApiError(status, msg, url));
    }

    // 다른 요청이 이미 갱신 중이면 완료될 때까지 대기
    // — 토큰을 두 번 갱신하면 첫 번째 새 토큰이 무효화되는 문제 방지
    if (_isRefreshing) {
      return new Promise((resolve) => {
        _refreshQueue.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    (originalRequest as any)._retry = true;
    _isRefreshing = true;

    try {
      const res = await apiClient.post<{ access_token: string }>('/auth/refresh');
      const newToken = res.data.access_token;
      await secureStorage.setToken(newToken);
      _onTokenRefreshed?.(newToken);
      processRefreshQueue(newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch {
      _refreshQueue = [];
      _onUnauthorized?.();
      return Promise.reject(new ApiError(status, msg, url));
    } finally {
      _isRefreshing = false;
    }
  },
);

export default apiClient;
