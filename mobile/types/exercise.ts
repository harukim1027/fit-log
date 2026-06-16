/**
 * @file types/exercise.ts
 * @description NL 빠른 기록 / 수동 입력 공용 타입.
 *
 * 앱은 운동을 "이름+카테고리" 기반으로 다룬다(카탈로그 id 미사용).
 * NL/수동 둘 다 같은 ExerciseDraft로 편집하고 같은 백엔드 코어로 저장된다.
 */

export interface SetDraft {
  weight: number;
  reps: number;
  unit: 'kg' | 'lbs';
  completed: boolean;
}

export interface ExerciseDraft {
  name: string;
  category: string;
  targetMuscles?: string[];
  sets: SetDraft[];
  /** nl-review에서 AI가 추정한 원래 표현 (예: "벤치 60 5x5") */
  rawName?: string;
}

/** quickLog로 저장된 종목 (백엔드 SavedExercise) */
export interface SavedExerciseDto {
  id: string;
  name: string;
  category: string;
  setCount: number;
  source: 'nl' | 'manual';
}

/** quickLog가 매칭하지 못한 종목 (사용자가 picker로 확정 필요) */
export interface UnmatchedExercise {
  name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
}

/** POST /workout-logs/quick 응답 */
export interface NLQuickResult {
  status: 'saved' | 'needs_clarification';
  sessionId?: string;
  saved?: SavedExerciseDto[];
  unmatched?: UnmatchedExercise[];
  undoIds?: string[];
  question?: string | null;
}

/** 수동/unmatched 매칭 저장 시 백엔드로 보내는 종목 단위 */
export interface NamedExercisePayload {
  name: string;
  category: string;
  targetMuscles?: string[];
  sets: { weight: number; reps: number; unit: string; completed: boolean }[];
}
