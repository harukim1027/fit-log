import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'kg' | 'lbs';

interface SettingsStore {
  weightUnit: WeightUnit;
  showBodypartSelector: boolean;
  /** 휴식 종료 30초 전 알림 (기본 꺼짐) */
  notifyBeforeRestEnd: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setShowBodypartSelector: (show: boolean) => Promise<void>;
  setNotifyBeforeRestEnd: (v: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  weightUnit: 'kg',
  showBodypartSelector: false,
  notifyBeforeRestEnd: false,
  loaded: false,

  loadSettings: async () => {
    const [unit, bodypart, notifyBefore] = await Promise.all([
      AsyncStorage.getItem('setting:weightUnit'),
      AsyncStorage.getItem('setting:showBodypartSelector'),
      AsyncStorage.getItem('setting:notifyBeforeRestEnd'),
    ]);
    set({
      weightUnit: (unit as WeightUnit) ?? 'kg',
      showBodypartSelector: bodypart === 'true',
      notifyBeforeRestEnd: notifyBefore === 'true',
      loaded: true,
    });
  },

  setWeightUnit: async (unit) => {
    await AsyncStorage.setItem('setting:weightUnit', unit);
    set({ weightUnit: unit });
  },

  setShowBodypartSelector: async (show) => {
    await AsyncStorage.setItem('setting:showBodypartSelector', String(show));
    set({ showBodypartSelector: show });
  },

  setNotifyBeforeRestEnd: async (v) => {
    await AsyncStorage.setItem('setting:notifyBeforeRestEnd', String(v));
    set({ notifyBeforeRestEnd: v });
  },
}));
