/**
 * @file store/recoverySettingsStore.ts
 * @description 부위별 회복 시간 사용자 커스터마이즈 (AsyncStorage 영속).
 * 커스텀 값만 저장하고, 없으면 DEFAULT_RECOVERY_HOURS를 폴백한다.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RECOVERY_HOURS } from '../constants/recoveryHours';

interface RecoverySettingsState {
  customHours: Record<string, number>; // 사용자 커스텀만 저장 (기본값은 폴백)
  loadSettings: () => Promise<void>;
  setHours: (category: string, hours: number) => Promise<void>;
  reset: (category: string) => Promise<void>;
  getHours: (category: string) => number;
}

const KEY = 'recovery_hours_custom';

export const useRecoverySettingsStore = create<RecoverySettingsState>((set, get) => ({
  customHours: {},

  loadSettings: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      try {
        set({ customHours: JSON.parse(raw) });
      } catch {}
    }
  },

  setHours: async (category, hours) => {
    const next = { ...get().customHours, [category]: hours };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    set({ customHours: next });
  },

  reset: async (category) => {
    const next = { ...get().customHours };
    delete next[category];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    set({ customHours: next });
  },

  getHours: (category) =>
    get().customHours[category] ?? DEFAULT_RECOVERY_HOURS[category] ?? 48,
}));
