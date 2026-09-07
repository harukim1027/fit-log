/**
 * @file store/authStore.ts
 * @description 인증 상태 전역 관리 (Zustand)
 *
 * 토큰 저장 전략:
 * - JWT → expo-secure-store (iOS Keychain / Android Keystore 암호화 영역)
 * - User 객체 → AsyncStorage (빠른 읽기, 민감 정보 없음)
 *
 * loadToken 초기화 패턴 (캐시 우선 + 백그라운드 갱신):
 * 1. 저장된 토큰+유저 즉시 세팅 → 앱 로딩 없이 화면 바로 표시
 * 2. 서버에서 최신 프로필 fetch → 체중/목표 등 변경 사항 반영
 * 3. 네트워크 오류 시 캐시 유지 → 오프라인에서도 앱 사용 가능
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';
import apiClient from '../lib/apiClient';
import { secureStorage } from '../lib/secureStorage';
import { useDietStore } from './dietStore';
import { clearAccountCache } from '../lib/accountCache';
import { useWorkoutStore } from './workoutStore';
import { useRoutineStore } from './routineStore';
import { useRestDayStore } from './restDayStore';
import { useFavoriteStore } from './favoriteStore';
import { useWaterStore } from './waterStore';
import { useExerciseStore } from './exerciseStore';
import { useHealthStore } from './healthStore';

export interface User {
  id: string;
  email: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  goal?: string;
  weeklyGoal?: number;
  isOnboardingDone?: boolean;
  targetCalories?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** 토큰 로드 완료 여부 — false 상태에서 라우팅하면 로그인 화면이 깜빡임 */
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  setToken: (token: string) => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateWeight: (weight: number) => Promise<void>;
}

/** AsyncStorage에 유저 정보 캐시 — 다음 앱 실행 시 즉시 사용 */
const saveUser = async (user: User) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

/**
 * 계정을 떠날 때 하는 정리. **로그아웃과 탈퇴가 같은 경로를 쓴다.**
 *
 * 두 가지를 같이 해야 한다.
 *   1) AsyncStorage 캐시 — 안 지우면 다른 계정으로 로그인한 뒤 서버 요청이
 *      실패했을 때 오프라인 폴백이 이전 사용자의 데이터를 읽는다.
 *   2) zustand 메모리 — 안 지우면 로그아웃 직후 화면에 이전 데이터가 그대로
 *      남는다. 캐시만 지우고 메모리를 두면 눈에 보이는 쪽이 안 고쳐진다.
 *
 * 기기 설정(테마·무게 단위·부위 선택기·휴식 알림)은 건드리지 않는다.
 * 사람이 아니라 이 기기에 속한 값이다.
 *
 * 새 계정 스토어가 생기면 여기 reset()을 추가하고, 새 캐시 키가 생기면
 * lib/accountCache.ts 의 목록에 등록할 것.
 */
const clearAccountState = async () => {
  await clearAccountCache();
  useWorkoutStore.getState().reset();
  useRoutineStore.getState().reset();
  useDietStore.getState().reset();
  useRestDayStore.getState().reset();
  useFavoriteStore.getState().reset();
  useWaterStore.getState().reset();
  useExerciseStore.getState().reset();
  useHealthStore.getState().reset();
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isReady: false,

  /**
   * 앱 시작 시 호출 (_layout.tsx AuthGate에서 useEffect로 한 번 실행).
   *
   * 두 단계로 진행하는 이유:
   * 1단계: 저장된 캐시를 즉시 반영 → 스플래시 → 홈 전환이 자연스럽게
   * 2단계: 서버 최신 상태 동기화 → 프로필 변경 사항 반영
   */
  loadToken: async () => {
    try {
      const token = await secureStorage.getToken();
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        // 캐시 즉시 세팅 (1단계)
        set({ token, user: JSON.parse(userStr) });
        try {
          // 서버에서 최신 프로필 pull (2단계)
          const res = await apiClient.get<User>('/users/me');
          const updated = res.data;
          // 기존 캐시와 머지 — 서버가 내려주지 않는 로컬 전용 필드 보존
          set((s) => ({ user: s.user ? { ...s.user, ...updated } : updated }));
          await saveUser(updated);
          // 서버 프로필에 영양 목표가 있으면 dietStore에도 동기화
          if (updated.targetCalories) {
            useDietStore.getState().setTargetCalories(updated.targetCalories);
          }
          const { targetCarbsRatio, targetProteinRatio, targetFatRatio } = updated as any;
          if (targetCarbsRatio && targetProteinRatio && targetFatRatio) {
            useDietStore.getState().setMacroRatios(targetCarbsRatio, targetProteinRatio, targetFatRatio);
          }
        } catch (e: any) {
          // 401: 토큰 만료 → 강제 로그아웃
          // 그 외 (네트워크 오류 등): 캐시 유지, 오프라인 모드로 계속
          if (e.response?.status === 401) {
            await secureStorage.removeToken();
            await clearAccountState();
            set({ token: null, user: null });
          }
        }
      }
    } catch {}
    // try 블록 밖에서 isReady 세팅 — 어떤 오류가 나도 앱이 멈추지 않도록
    set({ isReady: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      // 인터셉터 없는 순수 axios 사용 — 로그인 전엔 토큰이 없어 apiClient 인터셉터가 불필요
      const res = await axios.post(API_URL + '/auth/login', { email, password });
      const { access_token, user } = res.data;
      await secureStorage.setToken(access_token);
      await saveUser(user);
      set({ token: access_token, user, isLoading: false });
      // 로그인 직후 최신 프로필 pull (온보딩 완료 여부 등 반영)
      get().fetchMe().catch(() => {});
    } catch (e: any) {
      set({ isLoading: false });
      // status를 에러 객체에 첨부해 UI에서 "잘못된 비밀번호" 등 세분화 처리 가능하게
      const err = new Error(e.response?.data?.message || '로그인 실패') as any;
      err.status = e.response?.status;
      throw err;
    }
  },

  loginWithGoogle: async (accessToken: string) => {
    set({ isLoading: true });
    try {
      // 클라이언트 accessToken을 서버로 전달 → 서버가 Google API로 검증 후 JWT 발급
      // 클라이언트에서 직접 Google API를 믿지 않고 서버가 검증하는 구조로 보안 강화
      const res = await axios.post(API_URL + '/auth/google', { access_token: accessToken });
      const { access_token: token, user } = res.data;
      await secureStorage.setToken(token);
      await saveUser(user);
      set({ token, user });
      get().fetchMe().catch(() => {});
    } catch (e: any) {
      const err = new Error(e.response?.data?.message || `Google 로그인 실패 (${e.response?.status ?? e.message})`) as any;
      err.status = e.response?.status;
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await axios.post(API_URL + '/auth/register', { email, password, name });
      const { access_token, user } = res.data;
      await secureStorage.setToken(access_token);
      await saveUser(user);
      set({ token: access_token, user, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false });
      const err = new Error(e.response?.data?.message || '회원가입 실패') as any;
      err.status = e.response?.status;
      throw err;
    }
  },

  /** apiClient 인터셉터에서 토큰 갱신 후 스토어를 동기화할 때 사용 */
  setToken: (token) => {
    set({ token });
  },

  logout: async () => {
    await secureStorage.removeToken();
    // 'user' 도 clearAccountCache 가 지운다 — 목록이 한 곳에 있어야 빠지지 않는다.
    await clearAccountState();
    set({ token: null, user: null });
  },

  /** 서버에서 최신 프로필을 fetch하고 스토어 + 캐시 + 식단 목표를 동기화 */
  fetchMe: async () => {
    const res = await apiClient.get<User>('/users/me');
    const updated = res.data;
    set((s) => ({ user: s.user ? { ...s.user, ...updated } : updated }));
    await saveUser(updated);
    if (updated.targetCalories) {
      useDietStore.getState().setTargetCalories(updated.targetCalories);
    }
    const { targetCarbsRatio, targetProteinRatio, targetFatRatio } = updated as any;
    if (targetCarbsRatio && targetProteinRatio && targetFatRatio) {
      useDietStore.getState().setMacroRatios(targetCarbsRatio, targetProteinRatio, targetFatRatio);
    }
  },

  updateProfile: async (data: Partial<User>) => {
    try {
      console.log('[PATCH users/me] payload:', JSON.stringify(data));
      const res = await apiClient.patch<User>('/users/me', data);
      const updated = res.data;
      set((s) => ({ user: s.user ? { ...s.user, ...updated } : updated }));
      await saveUser(updated);
    } catch (e: any) {
      throw new Error(e.response?.data?.message || '프로필 업데이트 실패');
    }
  },

  updateWeight: async (weight: number) => {
    return get().updateProfile({ weight });
  },
}));
