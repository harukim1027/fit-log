/**
 * @file store/restDayStore.ts
 * @description 쉬는날(Rest Day) 전역 상태 관리 (Zustand)
 *
 * 요일 고정이 아니라 날짜(YYYY-MM-DD) 단위로 쉬는날을 지정/해제한다.
 *
 * 핵심 패턴 — Optimistic Update(낙관적 업데이트):
 * 로컬 상태를 즉시 토글한 뒤 AsyncStorage에 저장하고 서버에 반영한다.
 * 사용자는 네트워크 응답을 기다리지 않고 달력 마킹 변화를 바로 체감한다.
 * 서버 요청이 실패하면 fetchRestDays로 서버 상태를 다시 받아 롤백한다.
 *
 * 오프라인 지원:
 * - fetchRestDays 실패 시 AsyncStorage 캐시에서 복원
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';

interface RestDayStore {
  /** 쉬는날 날짜 목록 (YYYY-MM-DD), 오름차순 정렬 유지 */
  restDays: string[];
  /** 최초 로드 완료 여부 */
  loaded: boolean;
  fetchRestDays: () => Promise<void>;
  toggleRestDay: (date: string) => Promise<void>;
  isRestDay: (date: string) => boolean;
}

const STORAGE_KEY = 'restDays:v1';

const persist = async (restDays: string[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restDays));
};

export const useRestDayStore = create<RestDayStore>((set, get) => ({
  restDays: [],
  loaded: false,

  /**
   * 서버에서 쉬는날 목록을 가져온다.
   * 네트워크 실패 시 AsyncStorage 캐시로 폴백.
   */
  fetchRestDays: async () => {
    try {
      const res = await apiClient.get('/rest-days');
      const restDays: string[] = res.data.dates ?? [];
      set({ restDays, loaded: true });
      await persist(restDays);
    } catch {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) set({ restDays: JSON.parse(raw), loaded: true });
        else set({ loaded: true });
      } catch {
        set({ loaded: true });
      }
    }
  },

  /**
   * 해당 날짜의 쉬는날 지정/해제를 토글한다.
   * 로컬 → 캐시 → 서버 순으로 반영하고, 서버 실패 시 fetchRestDays로 롤백.
   */
  toggleRestDay: async (date) => {
    const current = get().restDays;
    const isRest = current.includes(date);
    const next = isRest
      ? current.filter((d) => d !== date)
      : [...current, date].sort();
    set({ restDays: next });
    await persist(next);
    try {
      if (isRest) {
        await apiClient.delete(`/rest-days/${date}`);
      } else {
        await apiClient.post('/rest-days', { date });
      }
    } catch (e) {
      console.error('쉬는날 저장 실패 (서버) — 롤백', e);
      await get().fetchRestDays();
    }
  },

  isRestDay: (date) => get().restDays.includes(date),
}));
