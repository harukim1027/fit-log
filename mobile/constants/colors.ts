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
};

export const lightColors: ThemeColors = {
  primary:   '#3D8BE0',
  secondary: '#5B9BD9',
  success:   '#2E9E83',
  warning:   '#C57F1C',
  danger:    '#E06A86',
  onAccent:  '#FFFFFF',
  background: '#F2F6FB',
  surface:    '#FFFFFF',
  surfaceAlt: '#EAF1F8',
  surfaceHigh:'#E4ECF4',
  border:     '#DCE6F0',
  textPrimary:   '#16202B',
  textSecondary: '#5A6675',
  textMuted:     '#9AA6B4',
  diet:    '#3D8BE0',
  workout: '#5B9BD9',
  stats:   '#C57F1C',
  water:   '#3D8BE0',
  carb:    '#D99A2B',
  protein: '#3D8BE0',
  fat:     '#E06A86',
};

export const darkColors: ThemeColors = {
  primary:   '#3D8BE0',
  secondary: '#5B9BD9',
  success:   '#4FA98C',
  warning:   '#CDB178',
  danger:    '#D58D9C',
  onAccent:  '#021526',
  background: '#171B21',
  surface:    '#21272F',
  surfaceAlt: '#22303F',
  surfaceHigh:'#2A3340',
  border:     '#384049',
  textPrimary:   '#E0E6EC',
  textSecondary: '#909AA6',
  textMuted:     '#646E7A',
  diet:    '#3D8BE0',
  workout: '#5B9BD9',
  stats:   '#CDB178',
  water:   '#3D8BE0',
  carb:    '#CDB178',
  protein: '#3D8BE0',
  fat:     '#D58D9C',
};

import { useThemeStore } from '../store/themeStore';

export function useColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'dark' ? darkColors : lightColors;
}

// 레거시 호환 (신규 코드는 useColors() 사용)
export const Colors = darkColors;
