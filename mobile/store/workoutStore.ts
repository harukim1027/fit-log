import { create } from "zustand";
import { Exercise, WorkoutSession, WorkoutSet } from "../types/workout";
import { Routine } from "./routineStore";
import apiClient from "../lib/apiClient";

export type CompareMode = "recent" | "pr" | "week" | "month";

export interface ExerciseHistoryEntry {
  date: string;
  maxWeight: number;
  maxVolume: number;
  totalSets: number;
  sets: { weight: number; reps: number }[];
}

export interface ExerciseHistory {
  history: ExerciseHistoryEntry[];
  pr: { weight: number; volume: number; date: string } | null;
  comparisonSession: ExerciseHistoryEntry | null;
}

const MET_MAP: Record<string, number> = {
  벤치프레스: 6.0,
  "인클라인 벤치프레스": 6.0,
  딥스: 8.0,
  데드리프트: 6.0,
  "바벨 로우": 6.0,
  오버헤드프레스: 6.0,
  풀업: 8.0,
  "사이드 레터럴 레이즈": 5.0,
  "바벨 컬": 5.0,
  "트라이셉스 익스텐션": 5.0,
  스쿼트: 6.0,
  레그프레스: 5.0,
  런지: 5.0,
  플랭크: 4.0,
  크런치: 4.0,
};

const getMET = (name: string): number => MET_MAP[name] ?? 5.0;

export const calculateCaloriesBurned = (
  session: WorkoutSession,
  weightKg: number,
  durationMinutes: number
): number => {
  if (!session.exercises.length || durationMinutes <= 0) return 0;
  const hours = durationMinutes / 60;
  const avgMET =
    session.exercises.reduce((sum, ex) => sum + getMET(ex.name), 0) /
    session.exercises.length;
  return Math.round(avgMET * weightKg * hours);
};

interface WorkoutStore {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  sessionStartTime: number | null;
  isLoading: boolean;
  exerciseHistoryCache: Map<string, ExerciseHistory>;
  workoutElapsed: number;
  workoutPaused: boolean;

  startSession: () => void;
  startSessionWithRoutine: (routine: Routine) => void;
  endSession: (caloriesBurned: number) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, "sets">) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (
    exerciseId: string,
    setId: string,
    data: Partial<WorkoutSet>
  ) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateExercise: (exerciseId: string, data: Partial<Omit<Exercise, 'id' | 'sets'>>) => void;
  removeExercise: (exerciseId: string) => void;
  updateSession: (sessionId: string, exercises: WorkoutSession['exercises']) => Promise<void>;
  reorderSessionExercises: (exercises: Exercise[]) => void;
  getTodaySession: () => WorkoutSession | null;
  getTotalVolume: (session: WorkoutSession) => number;
  fetchSessions: () => Promise<void>;
  createSessionForDate: (date: string, exercises: WorkoutSession['exercises']) => Promise<void>;
  fetchExerciseHistory: (
    exerciseName: string,
    mode?: CompareMode
  ) => Promise<ExerciseHistory | null>;

  setWorkoutElapsed: (v: number) => void;
  setWorkoutPaused: (v: boolean) => void;
  resetWorkoutTimer: () => void;
  startWorkoutTimer: () => void;
  stopWorkoutTimer: () => void;
}

const todayStr = () => new Date().toISOString().split("T")[0];

// interval은 store 밖에서 관리 (Zustand state에 넣으면 직렬화 문제)
let _workoutIntervalId: ReturnType<typeof setInterval> | null = null;

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  sessions: [],
  activeSession: null,
  sessionStartTime: null,
  isLoading: false,
  exerciseHistoryCache: new Map(),
  workoutElapsed: 0,
  workoutPaused: false,

  setWorkoutElapsed: (v) => set({ workoutElapsed: v }),

  setWorkoutPaused: (v) => {
    set({ workoutPaused: v });
    if (v) {
      if (_workoutIntervalId) {
        clearInterval(_workoutIntervalId);
        _workoutIntervalId = null;
      }
    } else {
      get().startWorkoutTimer();
    }
  },

  resetWorkoutTimer: () => {
    if (_workoutIntervalId) {
      clearInterval(_workoutIntervalId);
      _workoutIntervalId = null;
    }
    set({ workoutElapsed: 0, workoutPaused: false });
    // 리셋 후 바로 시작
    _workoutIntervalId = setInterval(() => {
      set((s) => ({ workoutElapsed: s.workoutElapsed + 1 }));
    }, 1000);
  },

  startWorkoutTimer: () => {
    if (_workoutIntervalId) clearInterval(_workoutIntervalId);
    _workoutIntervalId = setInterval(() => {
      set((s) => ({ workoutElapsed: s.workoutElapsed + 1 }));
    }, 1000);
  },

  stopWorkoutTimer: () => {
    if (_workoutIntervalId) {
      clearInterval(_workoutIntervalId);
      _workoutIntervalId = null;
    }
  },

  startSession: () => {
    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: todayStr(),
      exercises: [],
      durationMinutes: 0,
      note: "",
    };
    set({
      activeSession: session,
      sessionStartTime: Date.now(),
      workoutElapsed: 0,
      workoutPaused: false,
    });
    get().startWorkoutTimer();
  },

  startSessionWithRoutine: (routine) => {
    const now = Date.now();
    const exercises: Exercise[] = routine.exercises.map((ex, i) => ({
      id: `${now}-${i}`,
      name: ex.name,
      category: ex.category,
      settings: ex.settings,
      tip: ex.tip,
      restSeconds: ex.restSeconds,
      targetReps: ex.targetReps,
      targetMuscles: ex.targetMuscles,
      isSingleArm: ex.isSingleArm ?? false,
      differentSides: ex.differentSides ?? false,
      sets: ex.sets && ex.sets.length > 0
        ? ex.sets.map((rs, j) => ({
            id: `${now}-${i}-${j}`,
            weight: rs.targetWeight,
            reps: rs.targetReps,
            completed: false,
          }))
        : Array.from({ length: ex.defaultSets ?? 3 }, (_, j) => ({
            id: `${now}-${i}-${j}`,
            weight: ex.defaultWeight ?? 0,
            reps: ex.defaultReps ?? 0,
            completed: false,
          })),
    }));
    const session: WorkoutSession = {
      id: now.toString(),
      date: todayStr(),
      exercises,
      durationMinutes: 0,
      note: "",
      fromRoutineId: routine.id,
    };
    set({
      activeSession: session,
      sessionStartTime: now,
      workoutElapsed: 0,
      workoutPaused: false,
    });
    get().startWorkoutTimer();
    exercises.forEach((ex) => {
      get().fetchExerciseHistory(ex.name, "recent");
      get().fetchExerciseHistory(ex.name, "pr");
    });
  },

  deleteSession: async (id: string) => {
    try {
      await apiClient.delete(`/workout/${id}`);
      set((s) => ({ sessions: s.sessions.filter((s) => s.id !== id) }));
    } catch (e) {
      console.error("운동 기록 삭제 실패", e);
    }
  },

  endSession: async (caloriesBurned: number) => {
    const active = get().activeSession;
    const startTime = get().sessionStartTime;
    if (!active) return;

    const durationMinutes = startTime
      ? Math.max(Math.round((Date.now() - startTime) / 60000), 1)
      : 0;

    get().stopWorkoutTimer();
    set({ workoutElapsed: 0, workoutPaused: false });

    try {
      await apiClient.post("/workout", {
        date: active.date,
        durationMinutes,
        caloriesBurned,
        note: active.note,
        exercises: active.exercises.map((ex) => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? "",
          isSingleArm: ex.isSingleArm ?? false,
          differentSides: ex.differentSides ?? false,
          targetMuscles: ex.targetMuscles ?? [],
          restSeconds: ex.restSeconds ?? null,
          targetReps: ex.targetReps ?? "",
          sets: ex.sets.map((st) => ({
            weight: st.weight,
            weightR: st.weightR ?? null,
            reps: st.reps,
            completed: st.completed,
          })),
        })),
      });
      await get().fetchSessions();
    } catch (e) {
      console.error("운동 저장 실패", e);
    }
    set({ activeSession: null, sessionStartTime: null });
  },

  addExercise: (exercise) => {
    set((s) => {
      if (!s.activeSession) return s;
      const newEx: Exercise = { ...exercise, sets: [] };
      return {
        activeSession: {
          ...s.activeSession,
          exercises: [...s.activeSession.exercises, newEx],
        },
      };
    });
    get().fetchExerciseHistory(exercise.name, "recent");
    get().fetchExerciseHistory(exercise.name, "pr");
  },

  addSet: (exerciseId, workoutSet) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: [...ex.sets, workoutSet] }
              : ex
          ),
        },
      };
    });
  },

  updateSet: (exerciseId, setId, data) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((st) =>
                    st.id === setId ? { ...st, ...data } : st
                  ),
                }
              : ex
          ),
        },
      };
    });
  },

  removeSet: (exerciseId, setId) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.filter((st) => st.id !== setId) }
              : ex
          ),
        },
      };
    });
  },

  updateExercise: (exerciseId, data) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, ...data } : ex
          ),
        },
      };
    });
  },

  removeExercise: (exerciseId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.filter(ex => ex.id !== exerciseId),
        },
      };
    });
  },

  reorderSessionExercises: (exercises) => {
    set(s => {
      if (!s.activeSession) return s;
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateSession: async (sessionId, exercises) => {
    // Optimistic local update — avoids full re-render of all HistoryCards
    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === sessionId ? { ...sess, exercises } : sess
      ),
    }));
    try {
      await apiClient.patch(`/workout/${sessionId}`, {
        exercises: exercises.map(ex => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? '',
          isSingleArm: ex.isSingleArm ?? false,
          differentSides: ex.differentSides ?? false,
          targetMuscles: ex.targetMuscles ?? [],
          restSeconds: ex.restSeconds ?? null,
          targetReps: ex.targetReps ?? "",
          sets: ex.sets.map(st => ({
            weight: st.weight,
            weightR: st.weightR,
            reps: st.reps,
            completed: st.completed,
          })),
        })),
      });
    } catch (e) {
      // Revert optimistic update on failure
      await get().fetchSessions();
      console.error('운동 기록 수정 실패', e);
      throw e;
    }
  },

  getTodaySession: () => {
    const today = todayStr();
    return get().sessions.find((s) => s.date === today) ?? get().activeSession;
  },

  getTotalVolume: (session) =>
    session.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets.reduce((s, st) => {
          if (ex.isSingleArm) {
            if (ex.differentSides && st.weightR != null) {
              return s + (st.weight + st.weightR) * st.reps;
            }
            return s + st.weight * st.reps * 2;
          }
          return s + st.weight * st.reps;
        }, 0),
      0
    ),

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get("/workout");
      set({ sessions: res.data, isLoading: false });
    } catch (e) {
      console.error("운동 기록 불러오기 실패", e);
      set({ isLoading: false });
    }
  },

  createSessionForDate: async (date, exercises) => {
    await apiClient.post("/workout", {
      date,
      durationMinutes: 0,
      caloriesBurned: 0,
      note: "",
      exercises: exercises.map((ex) => ({
        name: ex.name,
        category: ex.category,
        settings: ex.settings ?? [],
        tip: ex.tip ?? "",
        isSingleArm: ex.isSingleArm ?? false,
        differentSides: ex.differentSides ?? false,
        targetMuscles: ex.targetMuscles ?? [],
        restSeconds: ex.restSeconds ?? null,
        targetReps: ex.targetReps ?? "",
        sets: ex.sets.map((st) => ({
          weight: st.weight,
          weightR: st.weightR ?? null,
          reps: st.reps,
          completed: st.completed,
        })),
      })),
    });
    await get().fetchSessions();
  },

  fetchExerciseHistory: async (exerciseName, mode = "recent") => {
    const cacheKey = `${exerciseName}:${mode}`;
    const cached = get().exerciseHistoryCache.get(cacheKey);
    if (cached) return cached;
    try {
      const res = await apiClient.get<ExerciseHistory>(
        "/workout/exercise-history",
        { params: { name: exerciseName, mode } }
      );
      const data = res.data;
      set((state) => {
        const next = new Map(state.exerciseHistoryCache);
        next.set(cacheKey, data);
        return { exerciseHistoryCache: next };
      });
      return data;
    } catch (e) {
      console.error("운동 히스토리 불러오기 실패", e);
      return null;
    }
  },
}));
