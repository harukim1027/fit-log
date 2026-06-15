/**
 * @file store/categoryColorStore.ts
 * @description 부위(카테고리)별 색상 — 사용자 커스터마이즈 (AsyncStorage).
 * 루틴 색상 시스템과 완전히 별개.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_CATEGORY_COLORS,
  FALLBACK_CATEGORY_COLOR,
} from '../constants/categoryColors';

interface CategoryColorState {
  /** 사용자 커스텀 색 (없는 부위는 기본값 사용) */
  colors: Record<string, string>;
  loadColors: () => Promise<void>;
  setColor: (category: string, color: string) => Promise<void>;
  resetColor: (category: string) => Promise<void>;
  /** 비반응형 조회 (렌더 밖/콜백용). 컴포넌트에서는 useCategoryColor() 권장 */
  getColor: (category: string) => string;
}

const KEY = 'category_colors';

export const resolveCategoryColor = (
  colors: Record<string, string>,
  category: string,
): string =>
  colors[category] ?? DEFAULT_CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLOR;

export const useCategoryColorStore = create<CategoryColorState>((set, get) => ({
  colors: {},

  loadColors: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      try {
        set({ colors: JSON.parse(raw) });
      } catch {}
    }
  },

  setColor: async (category, color) => {
    const next = { ...get().colors, [category]: color };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    set({ colors: next });
  },

  resetColor: async (category) => {
    const next = { ...get().colors };
    delete next[category];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    set({ colors: next });
  },

  getColor: (category) => resolveCategoryColor(get().colors, category),
}));

/**
 * 반응형 색상 조회 훅. colors 변경 시 자동 리렌더된다.
 * const getColor = useCategoryColor(); ... getColor('가슴')
 */
export const useCategoryColor = () => {
  const colors = useCategoryColorStore((s) => s.colors);
  return (category: string) => resolveCategoryColor(colors, category);
};
