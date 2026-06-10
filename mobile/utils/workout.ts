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

const toKg = (weight: number, unit?: string): number =>
  unit === 'lbs' ? weight / LBS_TO_KG : weight;

/** 완료된 세트 하나의 볼륨(kg) 반환. 미완료 세트는 0. */
export const calcSetVolume = (
  st: SetLike,
  isSingleArm = false,
): number => {
  if (!st.completed) return 0;
  const w = toKg(st.weight, st.unit);
  return isSingleArm ? w * st.reps * 2 : w * st.reps;
};

/** 완료된 세트만 합산한 종목 볼륨(kg) */
export const calcExerciseVolume = (ex: ExerciseLike): number =>
  ex.sets.reduce(
    (sum, st) => sum + calcSetVolume(st, ex.isSingleArm),
    0,
  );

/** 완료된 세트만 합산한 세션 총볼륨(kg) */
export const calcSessionVolume = (session: SessionLike): number =>
  session.exercises.reduce((sum, ex) => sum + calcExerciseVolume(ex), 0);
