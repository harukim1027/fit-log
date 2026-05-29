import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'kg' | 'lbs';

interface SettingsStore {
  weightUnit: WeightUnit;
  showBodypartSelector: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setShowBodypartSelector: (show: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  weightUnit: 'kg',
  showBodypartSelector: false,
  loaded: false,

  loadSettings: async () => {
    const [unit, bodypart] = await Promise.all([
      AsyncStorage.getItem('setting:weightUnit'),
      AsyncStorage.getItem('setting:showBodypartSelector'),
    ]);
    set({
      weightUnit: (unit as WeightUnit) ?? 'kg',
      showBodypartSelector: bodypart === 'true',
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
}));
