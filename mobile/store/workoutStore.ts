import { create } from 'zustand';
import { Exercise, WorkoutSession, WorkoutSet } from '../types/workout';
import apiClient from '../lib/apiClient';

interface WorkoutStore {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  isLoading: boolean;
  startSession: () => void;
  endSession: () => Promise<void>;
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
  isLoading: false,

  startSession: () => {
    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: todayStr(),
      exercises: [],
      durationMinutes: 0,
      note: '',
    };
    set({ activeSession: session });
  },

  endSession: async () => {
    const active = get().activeSession;
    if (!active) return;
    try {
      await apiClient.post('/workout', {
        date: active.date,
        durationMinutes: active.durationMinutes,
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
    set(s => ({ sessions: [...s.sessions, active], activeSession: null }));
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
