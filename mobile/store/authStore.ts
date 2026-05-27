import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';
import apiClient from '../lib/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  weight?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateWeight: (weight: number) => Promise<void>;
}

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
        set({ token, user: JSON.parse(userStr), isReady: true });
        // 최신 프로필(weight 포함) 백그라운드 갱신
        get().fetchMe().catch(() => {});
      } else {
        set({ isReady: true });
      }
    } catch {
      set({ isReady: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await axios.post(API_URL + '/auth/login', { email, password });
      const { access_token, user } = res.data;
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ token: access_token, user, isLoading: false });
      // 로그인 후 최신 프로필(weight 등) 가져오기
      get().fetchMe().catch(() => {});
    } catch (e: any) {
      set({ isLoading: false });
      throw new Error(e.response?.data?.message || '로그인 실패');
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await axios.post(API_URL + '/auth/register', { email, password, name });
      const { access_token, user } = res.data;
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ token: access_token, user, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false });
      throw new Error(e.response?.data?.message || '회원가입 실패');
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    try {
      const res = await apiClient.get<User>('/users/me');
      const updated = res.data;
      set((s) => ({ user: s.user ? { ...s.user, ...updated } : updated }));
      await AsyncStorage.setItem('user', JSON.stringify(updated));
    } catch {}
  },

  updateWeight: async (weight: number) => {
    try {
      const res = await apiClient.patch<User>('/users/me', { weight });
      const updated = res.data;
      set((s) => ({ user: s.user ? { ...s.user, ...updated } : updated }));
      await AsyncStorage.setItem('user', JSON.stringify(updated));
    } catch (e: any) {
      throw new Error(e.response?.data?.message || '체중 업데이트 실패');
    }
  },
}));
