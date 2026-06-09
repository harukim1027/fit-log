import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';
import apiClient from '../lib/apiClient';
import { useDietStore } from './dietStore';

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
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateWeight: (weight: number) => Promise<void>;
}

const saveUser = async (user: User) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isReady: false,

  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) });
        try {
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
        } catch (e: any) {
          if (e.response?.status === 401) {
            await AsyncStorage.multiRemove(['token', 'user']);
            set({ token: null, user: null });
          }
          // 네트워크 오류 등은 캐시된 유저/토큰 유지
        }
      }
    } catch {}
    set({ isReady: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await axios.post(API_URL + '/auth/login', { email, password });
      const { access_token, user } = res.data;
      await AsyncStorage.setItem('token', access_token);
      await saveUser(user);
      set({ token: access_token, user, isLoading: false });
      // 로그인 후 최신 프로필 가져오기
      get().fetchMe().catch(() => {});
    } catch (e: any) {
      set({ isLoading: false });
      const err = new Error(e.response?.data?.message || '로그인 실패') as any;
      err.status = e.response?.status;
      throw err;
    }
  },

  loginWithGoogle: async (accessToken: string) => {
    set({ isLoading: true });
    try {
      const res = await axios.post(API_URL + '/auth/google', { access_token: accessToken });
      const { access_token: token, user } = res.data;
      await AsyncStorage.setItem('token', token);
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
      await AsyncStorage.setItem('token', access_token);
      await saveUser(user);
      set({ token: access_token, user, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false });
      const err = new Error(e.response?.data?.message || '회원가입 실패') as any;
      err.status = e.response?.status;
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null });
  },

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
