import { create } from 'zustand';
import { Exercise, WorkoutSession, WorkoutSet } from '../types/workout';

interface WorkoutStore {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  startSession: () => void;
  endSession: () => void;
  addExercise: (exercise: Omit<Exercise, 'sets'>) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  getTodaySession: () => WorkoutSession | null;
  getTotalVolume: (session: WorkoutSession) => number;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  sessions: [],
  activeSession: null,

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

  endSession: () => {
    const active = get().activeSession;
    if (!active) return;
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
}));