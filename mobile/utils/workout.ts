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
export const toKg = (weight: number, unit?: string): number =>
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

// ── 종목별 성장 그래프 데이터 ────────────────────────────────────────────────

export interface GrowthPoint {
  /** 세션 날짜 (YYYY-MM-DD) */
  date: string;
  /** 완료 세트 중 kg 환산 최고 무게 (소수 1자리) */
  maxWeight: number;
}

type GrowthExerciseLike = { name: string; sets: SetLike[] };
type GrowthSessionLike = { date: string; exercises: GrowthExerciseLike[] };

/**
 * 종목별 성장 그래프용 데이터 포인트를 만든다.
 * 성장 그래프의 "유일한" 데이터 소스 — 화면(stats.tsx)에서 재계산하지 말고 이 함수만 사용한다.
 *
 * ⚠️ 회귀 방지 — 아래 규칙은 사용자 요청 사항이고 과거 여러 번 롤백된 이력이 있다. 지우지 말 것:
 *   1) 완료(completed=true) 세트만 계산 대상
 *   2) 완료 세트가 없는 세션은 데이터 포인트에서 제외
 *   3) kg 환산 최고 무게가 0 이하이면 제외 (맨몸/무게 미기록 → 선그래프가 바닥으로 낙하하는 노이즈 방지)
 *   4) 실제 무게를 든 날만 남겨 운동한 날끼리 자연스럽게 연결
 *   5) 포인트가 2개 미만이면 null 반환 (그래프 대신 안내 문구를 띄우기 위함)
 *
 * @param sessions - 세션 목록 (순서 무관 — 내부에서 날짜 오름차순 정렬)
 * @param exerciseName - 대상 종목명 (null이면 null)
 * @param limit - 최근 N개 포인트만 사용 (기본 8)
 */
export function buildExerciseGrowthData(
  sessions: GrowthSessionLike[],
  exerciseName: string | null,
  limit = 8,
): GrowthPoint[] | null {
  if (!exerciseName) return null;
  const points = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s): GrowthPoint | null => {
      // 한 세션에 같은 종목이 여러 번 등장할 수 있으므로 전부 모은 뒤 완료 세트만 사용
      const completedSets = s.exercises
        .filter((ex) => ex.name === exerciseName)
        .flatMap((ex) => ex.sets)
        .filter((st) => st.completed);
      if (completedSets.length === 0) return null; // 규칙 1·2
      const maxWeight = Math.max(...completedSets.map((st) => toKg(st.weight, st.unit)));
      if (maxWeight <= 0) return null; // 규칙 3
      return { date: s.date, maxWeight: Math.round(maxWeight * 10) / 10 };
    })
    .filter((d): d is GrowthPoint => d !== null) // 규칙 4
    .slice(-limit);
  return points.length >= 2 ? points : null; // 규칙 5
}

// ── 타겟부위별 세트 수 집계 ─────────────────────────────────────────────────

type MuscleExerciseLike = {
  sets: { completed: boolean }[];
  targetMuscles?: string[];
  category: string;
};
type MuscleSessionLike = { exercises: MuscleExerciseLike[] };

/** 카테고리(부위) → 색상. 통계/캘린더에서 부위별 막대 색으로 사용 */
export const MUSCLE_COLORS: Record<string, string> = {
  가슴: '#2E82F0',
  등: '#EF5E80',
  어깨: '#4FA98C',
  팔: '#9B7EDE',
  하체: '#7C8B3D',
  유산소: '#E89B4F',
  복근: '#54B0C4',
};

export const getMuscleColor = (muscle: string): string =>
  MUSCLE_COLORS[muscle] ?? '#888';

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
