// ============================================================
// FitLog 색 팔레트 — 라이트 / 다크 두 테마 (같은 코발트 블루 액센트)
// ============================================================

export type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  onAccent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceHigh: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  diet: string;
  workout: string;
  stats: string;
  water: string;
  carb: string;
  protein: string;
  fat: string;
  tagCoral: string;
  tagMint: string;
  tagSun: string;
};

export const lightColors: ThemeColors = {
  primary:   '#1E7AEA',
  secondary: '#5B9BD9',
  success:   '#2E9E83',
  warning:   '#E0950F',
  danger:    '#EF5E80',
  onAccent:  '#FFFFFF',
  background: '#F2F6FB',
  surface:    '#FFFFFF',
  surfaceAlt: '#EAF1F8',
  surfaceHigh:'#E4ECF4',
  border:     '#DCE6F0',
  textPrimary:   '#16202B',
  textSecondary: '#5A6675',
  textMuted:     '#9AA6B4',
  diet:    '#1E7AEA',
  workout: '#5B9BD9',
  stats:   '#E0950F',
  water:   '#1E7AEA',
  carb:    '#E0950F',
  protein: '#1E7AEA',
  fat:     '#EF5E80',
  tagCoral: '#FF6B47',
  tagMint:  '#12B07A',
  tagSun:   '#EC9A09',
};

export const darkColors: ThemeColors = {
  primary:   '#2E82F0',
  secondary: '#5B9BD9',
  success:   '#4FA98C',
  warning:   '#E8A93C',
  danger:    '#F07A95',
  onAccent:  '#021526',
  background: '#171B21',
  surface:    '#21272F',
  surfaceAlt: '#22303F',
  surfaceHigh:'#2A3340',
  border:     '#384049',
  textPrimary:   '#E0E6EC',
  textSecondary: '#909AA6',
  textMuted:     '#646E7A',
  diet:    '#2E82F0',
  workout: '#5B9BD9',
  stats:   '#E8A93C',
  water:   '#2E82F0',
  carb:    '#E8A93C',
  protein: '#2E82F0',
  fat:     '#F07A95',
  tagCoral: '#FF6B47',
  tagMint:  '#22C58B',
  tagSun:   '#F5A623',
};

import { useThemeStore } from '../store/themeStore';

export function useColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'dark' ? darkColors : lightColors;
}

// 레거시 호환 (신규 코드는 useColors() 사용)
export const Colors = darkColors;
