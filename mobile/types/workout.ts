export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
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
}

export interface WorkoutSession {
  id: string;
  date: string;
  exercises: Exercise[];
  durationMinutes: number;
  note: string;
}
