/**
 * @file utils/recovery.ts
 * @description 부위별 마지막 운동 시점 → 회복 상태(신호등) 계산.
 *
 * 강도는 반영하지 않는다. 해당 부위의 완료 세트가 하나라도 있으면 그 날짜를
 * "마지막 운동일"로 보고, 경과 시간 / 회복 시간 비율로 상태를 판정한다.
 */
import type { WorkoutSession } from '../types/workout';
import {
  DEFAULT_RECOVERY_HOURS,
  RECOVERY_THRESHOLDS,
} from '../constants/recoveryHours';

export type RecoveryStatus = 'ready' | 'caution' | 'rest';

export interface CategoryRecovery {
  category: string;
  status: RecoveryStatus;
  hoursSinceLastWorkout: number | null; // null = 기록 없음(=ready)
  recoveryHours: number;
}

/** 부위별 마지막 운동 시점 → 회복 상태 계산 */
export function getCategoryRecovery(
  category: string,
  sessions: WorkoutSession[],
  getRecoveryHours: (cat: string) => number,
): CategoryRecovery {
  const recoveryHours = getRecoveryHours(category);

  // 해당 카테고리의 완료 세트가 있는 가장 최근 세션 찾기
  let lastTime: number | null = null;

  sessions.forEach((session) => {
    const hasCategory = session.exercises.some((ex) => {
      if (ex.category !== category) return false;
      return ex.sets.some((s) => s.completed);
    });
    if (!hasCategory) return;

    const t = new Date(session.date).getTime();
    if (Number.isNaN(t)) return;
    if (lastTime === null || t > lastTime) lastTime = t;
  });

  if (lastTime === null) {
    return { category, status: 'ready', hoursSinceLastWorkout: null, recoveryHours };
  }

  const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
  const ratio = hoursSince / recoveryHours;

  let status: RecoveryStatus;
  if (ratio < RECOVERY_THRESHOLDS.rest) status = 'rest';
  else if (ratio < RECOVERY_THRESHOLDS.caution) status = 'caution';
  else status = 'ready';

  return { category, status, hoursSinceLastWorkout: hoursSince, recoveryHours };
}

/** 모든 카테고리 회복 상태 */
export function getAllCategoryRecoveries(
  sessions: WorkoutSession[],
  getRecoveryHours: (cat: string) => number,
): CategoryRecovery[] {
  return Object.keys(DEFAULT_RECOVERY_HOURS).map((cat) =>
    getCategoryRecovery(cat, sessions, getRecoveryHours),
  );
}
