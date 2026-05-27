import { create } from 'zustand';
import { Exercise, WorkoutSession, WorkoutSet } from '../types/workout';
import apiClient from '../lib/apiClient';

// MET 값 매핑 (운동강도지표)
const MET_MAP: Record<string, number> = {
  '벤치프레스': 6.0,
  '인클라인 벤치프레스': 6.0,
  '딥스': 8.0,
  '데드리프트': 6.0,
  '바벨 로우': 6.0,
  '오버헤드프레스': 6.0,
  '풀업': 8.0,
  '사이드 레터럴 레이즈': 5.0,
  '바벨 컬': 5.0,
  '트라이셉스 익스텐션': 5.0,
  '스쿼트': 6.0,
  '레그프레스': 5.0,
  '런지': 5.0,
  '플랭크': 4.0,
  '크런치': 4.0,
};

const getMET = (name: string): number => MET_MAP[name] ?? 5.0;

// MET × 체중(kg) × 운동시간(h)
export const calculateCaloriesBurned = (
  session: WorkoutSession,
  weightKg: number,
  durationMinutes: number,
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
  startSession: () => void;
  endSession: (caloriesBurned: number) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, 'sets'>) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  getTodaySession: () => WorkoutSession | null;
  getTotalVolume: (session: WorkoutSession) => number;
  fetchSessions: () => Promise<void>;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  sessions: [],
  activeSession: null,
  sessionStartTime: null,
  isLoading: false,

  startSession: () => {
    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: todayStr(),
      exercises: [],
      durationMinutes: 0,
      note: '',
    };
    set({ activeSession: session, sessionStartTime: Date.now() });
  },

  endSession: async (caloriesBurned: number) => {
    const active = get().activeSession;
    const startTime = get().sessionStartTime;
    if (!active) return;

    const durationMinutes = startTime
      ? Math.max(Math.round((Date.now() - startTime) / 60000), 1)
      : 0;

    try {
      await apiClient.post('/workout', {
        date: active.date,
        durationMinutes,
        caloriesBurned,
        note: active.note,
        exercises: active.exercises.map(ex => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? '',
          sets: ex.sets.map(st => ({
            weight: st.weight,
            reps: st.reps,
            completed: st.completed,
          })),
        })),
      });
      await get().fetchSessions();
    } catch (e) {
      console.error('운동 저장 실패', e);
    }
    set({ activeSession: null, sessionStartTime: null });
  },

  addExercise: (exercise) => {
    set(s => {
      if (!s.activeSession) return s;
      const newEx: Exercise = { ...exercise, sets: [] };
      return { activeSession: { ...s.activeSession, exercises: [...s.activeSession.exercises, newEx] } };
    });
  },

  addSet: (exerciseId, workoutSet) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, sets: [...ex.sets, workoutSet] } : ex
          ),
        },
      };
    });
  },

  updateSet: (exerciseId, setId, data) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.map(st => st.id === setId ? { ...st, ...data } : st) }
              : ex
          ),
        },
      };
    });
  },

  removeSet: (exerciseId, setId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.filter(st => st.id !== setId) }
              : ex
          ),
        },
      };
    });
  },

  getTodaySession: () => {
    const today = todayStr();
    return get().sessions.find(s => s.date === today) ?? get().activeSession;
  },

  getTotalVolume: (session) =>
    session.exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, st) => s + st.weight * st.reps, 0), 0
    ),

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/workout');
      set({ sessions: res.data, isLoading: false });
    } catch (e) {
      console.error('운동 기록 불러오기 실패', e);
      set({ isLoading: false });
    }
  },
}));
