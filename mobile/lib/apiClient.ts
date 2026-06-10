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
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';

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

/** 외부에서 401 핸들러를 주입받는 이유: 순환 참조 방지
 *  (_layout.tsx → authStore → apiClient → authStore 의존 순환을 끊음) */
let _onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
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
    const activeSession = useWorkoutStore.getState().activeSession;
    if (activeSession) return Promise.reject(new ApiError(status, msg, url));

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
      useAuthStore.getState().setToken(newToken);
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
