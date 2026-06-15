/**
 * @file utils/workout.ts
 * @description 운동 볼륨 계산 순수 함수 모음
 *
 * 핵심 개념: "볼륨 = 무게 × 횟수"
 * - 완료된 세트만 집계 (미완료 세트는 진행 중으로 간주)
 * - lbs 사용자는 kg 기준으로 환산해 통일된 단위로 표시
 * - 단팔 운동(isSingleArm)은 양팔 합산을 위해 × 2
 */

type SetLike = {
  weight: number;
  reps: number;
  completed: boolean;
  unit?: string;
};

type ExerciseLike = {
  sets: SetLike[];
  isSingleArm?: boolean;
};

type SessionLike = {
  exercises: ExerciseLike[];
};

const LBS_TO_KG = 2.20462;

/** 무게를 항상 kg 기준으로 정규화 */
const toKg = (weight: number, unit?: string): number =>
  unit === 'lbs' ? weight / LBS_TO_KG : weight;

/**
 * 세트 하나의 볼륨(kg)을 반환한다.
 * 미완료 세트는 0을 반환해 진행 중인 세트를 집계에서 제외한다.
 *
 * @param st - 세트 데이터
 * @param isSingleArm - 단팔 운동 여부 (덤벨 런지 등) — 양팔 합산이므로 × 2
 *
 * @example
 * calcSetVolume({ weight: 100, reps: 10, completed: true }) // 1000
 * calcSetVolume({ weight: 50, reps: 8, completed: false })  // 0 (미완료)
 */
export const calcSetVolume = (
  st: SetLike,
  isSingleArm = false,
): number => {
  if (!st.completed) return 0;
  const w = toKg(st.weight, st.unit);
  return isSingleArm ? w * st.reps * 2 : w * st.reps;
};

/**
 * 종목 하나의 총 볼륨(kg)을 반환한다.
 * 완료된 세트만 합산하므로, 세트 도중 화면을 나가도 실제 수행량만 반영된다.
 *
 * @example
 * calcExerciseVolume({ sets: [
 *   { weight: 100, reps: 10, completed: true },  // 1000
 *   { weight: 100, reps: 10, completed: false }, // 0 (미완료)
 * ]}) // 1000
 */
export const calcExerciseVolume = (ex: ExerciseLike): number =>
  ex.sets.reduce(
    (sum, st) => sum + calcSetVolume(st, ex.isSingleArm),
    0,
  );

/**
 * 세션 전체의 총 볼륨(kg)을 반환한다.
 * 통계 화면과 운동 완료 화면에서 "오늘의 총 볼륨"을 표시할 때 사용된다.
 */
export const calcSessionVolume = (session: SessionLike): number =>
  session.exercises.reduce((sum, ex) => sum + calcExerciseVolume(ex), 0);

// ── 타겟부위별 세트 수 집계 ─────────────────────────────────────────────────

type MuscleExerciseLike = {
  sets: { completed: boolean }[];
  targetMuscles?: string[];
  category: string;
};
type MuscleSessionLike = { exercises: MuscleExerciseLike[] };

// 부위별 색상은 categoryColorStore / constants/categoryColors로 이전됨
// (사용자 커스터마이즈 지원). 여기서는 집계 함수만 유지한다.

/**
 * 세션의 타겟부위별 "완료" 세트 수 집계.
 * targetMuscles가 있으면 부위별로, 없으면 category로 분류한다.
 */
export function getMuscleSetCounts(
  session: MuscleSessionLike,
): Record<string, number> {
  const counts: Record<string, number> = {};
  session.exercises.forEach((ex) => {
    const completedSets = ex.sets.filter((s) => s.completed).length;
    if (completedSets === 0) return;
    const muscles = ex.targetMuscles?.length ? ex.targetMuscles : [ex.category];
    muscles.forEach((muscle) => {
      counts[muscle] = (counts[muscle] ?? 0) + completedSets;
    });
  });
  return counts;
}

/** 같은 날 여러 세션의 부위별 세트 수 통합 집계 */
export function getMuscleSetCountsForDate(
  sessions: MuscleSessionLike[],
): Record<string, number> {
  const total: Record<string, number> = {};
  sessions.forEach((s) => {
    const counts = getMuscleSetCounts(s);
    Object.entries(counts).forEach(([m, cnt]) => {
      total[m] = (total[m] ?? 0) + cnt;
    });
  });
  return total;
}
