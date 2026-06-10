import axios from 'axios';
import { API_URL } from '../constants/api';
import { secureStorage } from './secureStorage';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({ baseURL: API_URL, timeout: 10000 });

apiClient.interceptors.request.use(async (config) => {
  const token = await secureStorage.getToken();
  if (token) config.headers.Authorization = 'Bearer ' + token;
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params ?? '');
  return config;
});

let _onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
};

let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

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
    const status = error.response?.status;
    const originalRequest = error.config;
    const url = originalRequest?.url ?? '';
    const msg = error.code === 'ECONNABORTED' ? 'timeout' : (error.message ?? '');
    console.error(`[API] ✗ ${status ?? 'ERR'} ${url} — ${msg}`);

    if (status !== 401 || !originalRequest) return Promise.reject(error);

    // 운동 중 401은 갱신/로그아웃 없이 무시
    const activeSession = useWorkoutStore.getState().activeSession;
    if (activeSession) return Promise.reject(error);

    // refresh 요청 자체가 401 → 토큰 완전 만료, 로그아웃
    if (url.includes('/auth/refresh')) {
      _refreshQueue = [];
      _isRefreshing = false;
      _onUnauthorized?.();
      return Promise.reject(error);
    }

    // 이미 한 번 retry한 요청이면 로그아웃
    if ((originalRequest as any)._retry) {
      _onUnauthorized?.();
      return Promise.reject(error);
    }

    // 다른 갱신이 진행 중이면 큐에 대기
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
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
      return Promise.reject(error);
    } finally {
      _isRefreshing = false;
    }
  },
);

export default apiClient;
