import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'fitlog-theme';

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrate: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  hydrated: false,
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  },
  toggle: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
  hydrate: async () => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') set({ mode: saved });
    } finally {
      set({ hydrated: true });
    }
  },
}));
