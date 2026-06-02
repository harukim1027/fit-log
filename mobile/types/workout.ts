export interface WorkoutSet {
  id: string;
  weight: number;
  weightR?: number; // 우측 무게 (differentSides 시 사용)
  reps: number;
  completed: boolean;
  unit?: 'kg' | 'lbs';
}

export interface ExerciseSetting {
  key: string;
  value: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  sets: WorkoutSet[];
  settings?: ExerciseSetting[];
  tip?: string;
  isSingleArm?: boolean;
  differentSides?: boolean;
  targetMuscles?: string[];
  restSeconds?: number;
  targetReps?: string;
  note?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  exercises: Exercise[];
  durationMinutes: number;
  note: string;
  caloriesBurned?: number;
  fromRoutineId?: string;
}
