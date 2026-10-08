/**
 * @file app/routine/_helpers.ts
 * @description 루틴 라우트들이 공유하는 순수 헬퍼·상수.
 *
 * 파일명이 `_` 로 시작하면 expo-router 가 라우트로 잡지 않는다.
 *
 * 전에는 `modal/routine-manage.tsx` 한 파일에 모여 있었다. 라우트가 갈리면서
 * 둘 이상이 쓰는 것만 여기로 모은다 — 한쪽만 고쳐져 어긋나는 것을 막는다.
 */
import { darkColors, lightColors } from "../../constants/colors";
import type { Routine, RoutineExercise } from "../../store/routineStore";

export const fmtRest = (sec: number): string => {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
};

export const fmtMeta = (targetReps?: string, restSeconds?: number): string | null => {
  const parts: string[] = [];
  if (targetReps?.trim()) parts.push(targetReps.trim());
  if (restSeconds && restSeconds > 0) parts.push(fmtRest(restSeconds));
  return parts.length > 0 ? parts.join(" · ") : null;
};

export const setCount = (ex: RoutineExercise): number => {
  const n = Number(ex.defaultSets);
  if (Number.isFinite(n) && n > 0) return n;
  return Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets.length : 3;
};

/**
 * 예상 소요 시간(분). 총 세트 수 × 3분.
 *
 * 3분은 세트 수행 + 휴식을 합친 어림값이다. 루틴에 `restSeconds` 가 있으면
 * 더 정확히 낼 수 있지만(실데이터는 150초대), 세트당 40초 수행 + 150초 휴식이
 * 3.2분이라 지금 값과 크게 다르지 않아 그대로 둔다.
 */
export const estimateMinutes = (r: Routine): number =>
  r.exercises.reduce((sum, ex) => sum + setCount(ex), 0) * 3;

export const ROUTINE_ITEM_H = 102; // 카드 높이 ~92 + marginBottom 10
// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
export const LIGHT_SHADOW_SM = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

// 오버레이 암막. 계층 토큰이 아니라 화면을 덮는 막이라 별도 상수로 둔다.
export const SCRIM = "rgba(0,0,0,0.5)";

// WCAG 2.1 상대 휘도 — 강조색 채움 위 라벨 색을 대비로 고르기 위해서만 쓴다.
export function relLuminance(hex: string): number {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((x) => x + x).join("") : m;
  const ch = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// danger·secondary 채움 위 라벨. onAccent는 primary 기준 토큰이라 다른 강조색
// 위에서는 대비가 보장되지 않는다(라이트 danger 위 흰색 3.19:1).
// 색을 새로 만들지 않고 colors.ts의 onAccent 두 값 중 대비가 높은 쪽만 고른다.
export function onFill(bg: string): string {
  return contrastRatio(bg, darkColors.onAccent) >= contrastRatio(bg, lightColors.onAccent)
    ? darkColors.onAccent
    : lightColors.onAccent;
}

export const EXERCISE_ITEM_H = 80; // 카드 높이 ~72 + marginBottom 8
