import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Exercise, WorkoutSession, WorkoutSet } from "../types/workout";
import { Routine } from "./routineStore";
import apiClient from "../lib/apiClient";
import { calcSessionVolume } from "../utils/workout";

const WORKOUT_DRAFT_KEY = "workout_draft";

let _draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

const saveWorkoutDraft = (
  session: WorkoutSession | null,
  sessionStartTime: number | null,
  workoutElapsed: number,
) => {
  if (!session) {
    if (_draftSaveTimer) { clearTimeout(_draftSaveTimer); _draftSaveTimer = null; }
    AsyncStorage.removeItem(WORKOUT_DRAFT_KEY).catch(() => {});
    return;
  }
  if (_draftSaveTimer) clearTimeout(_draftSaveTimer);
  _draftSaveTimer = setTimeout(() => {
    AsyncStorage.setItem(
      WORKOUT_DRAFT_KEY,
      JSON.stringify({ session, sessionStartTime, workoutElapsed, savedAt: Date.now() }),
    ).catch(() => {});
  }, 300);
};

export type CompareMode = "recent" | "pr" | "week" | "month";

export interface ExerciseHistoryEntry {
  date: string;
  maxWeight: number;
  maxVolume: number;
  totalSets: number;
  sets: { weight: number; reps: number; unit?: string }[];
}

export interface ExerciseHistory {
  history: ExerciseHistoryEntry[];
  pr: { weight: number; volume: number; date: string } | null;
  comparisonSession: ExerciseHistoryEntry | null;
}

const getCategoryMET = (category: string): number => {
  const lower = category?.toLowerCase() ?? '';
  if (lower.includes('유산소') || lower.includes('cardio')) return 7.0;
  if (lower.includes('하체')) return 5.0;
  return 3.5;
};

export const calculateCaloriesBurned = (
  session: WorkoutSession,
  weightKg: number,
  durationMinutes: number,
): number => {
  if (durationMinutes <= 0) return 0;
  const categories = session.exercises.map((ex) => ex.category ?? '');
  const avgMET =
    categories.length > 0
      ? categories.reduce((sum, cat) => sum + getCategoryMET(cat), 0) / categories.length
      : 3.5;
  const hours = durationMinutes / 60;
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

  cancelSession: () => void;
  restoreDraft: () => Promise<boolean>;
  setWorkoutElapsed: (v: number) => void;
  setWorkoutPaused: (v: boolean) => void;
  resetWorkoutTimer: () => void;
  startWorkoutTimer: () => void;
  stopWorkoutTimer: () => void;
}

const todayStr = () => new Date().toISOString().split("T")[0];

// interval/timer 상태는 store 밖에서 관리 (Zustand state에 넣으면 직렬화 문제)
let _workoutIntervalId: ReturnType<typeof setInterval> | null = null;
// 타이머 시작 시각 기반 방식: 백그라운드에서도 정확한 경과 시간 계산
let _workoutTimerBase = 0;    // 현재 세그먼트 시작 시점 (Date.now())
let _workoutElapsedBase = 0;  // 현재 세그먼트 시작 시점의 누적 경과(초)

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  sessions: [],
  activeSession: null,
  sessionStartTime: null,
  isLoading: false,
  exerciseHistoryCache: new Map(),
  workoutElapsed: 0,
  workoutPaused: false,

  cancelSession: () => {
    get().stopWorkoutTimer();
    set({ activeSession: null, sessionStartTime: null, workoutElapsed: 0, workoutPaused: false });
    saveWorkoutDraft(null, null, 0);
  },

  restoreDraft: async () => {
    try {
      const raw = await AsyncStorage.getItem(WORKOUT_DRAFT_KEY);
      if (!raw) return false;
      const { session, sessionStartTime, workoutElapsed, savedAt } = JSON.parse(raw);
      const hoursSince = (Date.now() - savedAt) / 1000 / 60 / 60;
      if (hoursSince > 24) {
        await AsyncStorage.removeItem(WORKOUT_DRAFT_KEY);
        return false;
      }
      set({ activeSession: session, sessionStartTime, workoutElapsed: workoutElapsed ?? 0 });
      return true;
    } catch {
      return false;
    }
  },

  setWorkoutElapsed: (v) => set({ workoutElapsed: v }),

  setWorkoutPaused: (v) => {
    set({ workoutPaused: v });
    if (v) {
      if (_workoutIntervalId) {
        clearInterval(_workoutIntervalId);
        _workoutIntervalId = null;
      }
      // 일시정지 시점의 경과 시간 고정
      _workoutElapsedBase = get().workoutElapsed;
    } else {
      get().startWorkoutTimer();
    }
  },

  resetWorkoutTimer: () => {
    if (_workoutIntervalId) {
      clearInterval(_workoutIntervalId);
      _workoutIntervalId = null;
    }
    _workoutElapsedBase = 0;
    _workoutTimerBase = Date.now();
    set({ workoutElapsed: 0, workoutPaused: false });
    _workoutIntervalId = setInterval(() => {
      const elapsed = _workoutElapsedBase + Math.floor((Date.now() - _workoutTimerBase) / 1000);
      set({ workoutElapsed: elapsed });
    }, 1000);
  },

  startWorkoutTimer: () => {
    if (_workoutIntervalId) clearInterval(_workoutIntervalId);
    _workoutTimerBase = Date.now();
    _workoutElapsedBase = get().workoutElapsed;
    _workoutIntervalId = setInterval(() => {
      const elapsed = _workoutElapsedBase + Math.floor((Date.now() - _workoutTimerBase) / 1000);
      set({ workoutElapsed: elapsed });
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
    const now = Date.now();
    set({
      activeSession: session,
      sessionStartTime: now,
      workoutElapsed: 0,
      workoutPaused: false,
    });
    get().startWorkoutTimer();
    saveWorkoutDraft(session, now, 0);
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
      sets: ex.sets && ex.sets.length > 0
        ? ex.sets.map((rs, j) => ({
            id: `${now}-${i}-${j}`,
            weight: Number(rs.targetWeight ?? 0),
            reps: Number(rs.targetReps ?? 0),
            completed: false,
            unit: rs.unit ?? 'kg',
          }))
        : Array.from({ length: ex.defaultSets ?? 3 }, (_, j) => ({
            id: `${now}-${i}-${j}`,
            weight: Number(ex.defaultWeight ?? 0),
            reps: Number(ex.defaultReps ?? 0),
            completed: false,
            unit: ex.defaultUnit ?? 'kg',
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
    saveWorkoutDraft(session, now, 0);
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
        exercises: active.exercises.map((ex, idx) => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? "",
          isSingleArm: ex.isSingleArm ?? false,
          targetMuscles: ex.targetMuscles ?? [],
          restSeconds: ex.restSeconds ?? null,
          targetReps: ex.targetReps ?? "",
          order: idx,
          sets: ex.sets.map((st) => ({
            weight: st.weight,
            reps: st.reps,
            completed: st.completed,
            unit: st.unit ?? 'kg',
          })),
        })),
      });
      await get().fetchSessions();
    } catch (e) {
      console.error("운동 저장 실패", e);
    }
    set({ activeSession: null, sessionStartTime: null });
    saveWorkoutDraft(null, null, 0);
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
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
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
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
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
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
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
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
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
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
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
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  reorderSessionExercises: (exercises) => {
    set(s => {
      if (!s.activeSession) return s;
      return { activeSession: { ...s.activeSession, exercises } };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
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
        exercises: exercises.map((ex, idx) => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? '',
          isSingleArm: ex.isSingleArm ?? false,
          targetMuscles: ex.targetMuscles ?? [],
          restSeconds: ex.restSeconds ?? null,
          targetReps: ex.targetReps ?? "",
          order: idx,
          sets: ex.sets.map(st => ({
            weight: st.weight,
            reps: st.reps,
            completed: st.completed,
            unit: st.unit ?? 'kg',
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

  getTotalVolume: (session) => calcSessionVolume(session),

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get("/workout");
      const sessions = (res.data as WorkoutSession[]).map(s => ({
        ...s,
        exercises: [...s.exercises].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
      }));
      set({ sessions, isLoading: false });
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
      exercises: exercises.map((ex, idx) => ({
        name: ex.name,
        category: ex.category,
        settings: ex.settings ?? [],
        tip: ex.tip ?? "",
        isSingleArm: ex.isSingleArm ?? false,
        targetMuscles: ex.targetMuscles ?? [],
        restSeconds: ex.restSeconds ?? null,
        targetReps: ex.targetReps ?? "",
        order: idx,
        sets: ex.sets.map((st) => ({
          weight: st.weight,
          reps: st.reps,
          completed: st.completed,
          unit: st.unit ?? 'kg',
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
