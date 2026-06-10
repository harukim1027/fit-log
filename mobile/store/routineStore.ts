import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import type { WorkoutSession } from '../types/workout';

export interface RoutineSet {
  setNumber: number;
  targetWeight: number;
  targetReps: number;
  unit: 'kg' | 'lbs';
}

export interface RoutineExercise {
  name: string;
  category: string;
  defaultSets: number;
  defaultWeight?: number;
  defaultUnit?: 'kg' | 'lbs';
  defaultReps?: number;
  sets?: RoutineSet[];
  restSeconds?: number;
  targetReps?: string;
  settings?: { key: string; value: string }[];
  tip?: string;
  targetMuscles?: string[];
  gifUrl?: string;
  isSingleArm?: boolean;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: string;
  isPublic?: boolean;
  shareCode?: string;
  copyCount?: number;
  authorName?: string;
}

interface RoutineStore {
  routines: Routine[];
  publicRoutines: Routine[];
  loaded: boolean;
  loadRoutines: () => Promise<void>;
  addRoutine: (routine: Omit<Routine, 'id' | 'createdAt'>) => Promise<void>;
  updateRoutine: (id: string, data: Partial<Omit<Routine, 'id' | 'createdAt'>>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  shareRoutine: (id: string) => Promise<void>;
  unshareRoutine: (id: string) => Promise<void>;
  fetchPublicRoutines: (sort?: 'latest' | 'popular') => Promise<void>;
  copyRoutine: (id: string) => Promise<void>;
  searchByCode: (code: string) => Promise<Routine>;
  updateRoutineFromSession: (routineId: string, session: WorkoutSession) => Promise<void>;
  combineRoutines: (routineIds: string[], name: string, exercises: RoutineExercise[]) => Promise<void>;
  reorderRoutines: (ids: string[]) => Promise<void>;
  reorderExercises: (routineId: string, exercises: RoutineExercise[]) => Promise<void>;
}

const STORAGE_KEY = 'routines:v2';

const persist = async (routines: Routine[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
};

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  routines: [],
  publicRoutines: [],
  loaded: false,

  loadRoutines: async () => {
    try {
      const res = await apiClient.get('/routine');
      const routines: Routine[] = res.data;
      set({ routines, loaded: true });
      await persist(routines);
    } catch {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) set({ routines: JSON.parse(raw), loaded: true });
        else set({ loaded: true });
      } catch {
        set({ loaded: true });
      }
    }
  },

  addRoutine: async (data) => {
    try {
      const res = await apiClient.post('/routine', data);
      const routine: Routine = res.data;
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    } catch {
      const routine: Routine = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    }
  },

  updateRoutine: async (id, data) => {
    const next = get().routines.map(r => r.id === id ? { ...r, ...data } : r);
    set({ routines: next });
    await persist(next);
    try {
      await apiClient.patch(`/routine/${id}`, data);
    } catch (e) {
      console.error('루틴 저장 실패 (서버)', e);
    }
  },

  deleteRoutine: async (id) => {
    const next = get().routines.filter(r => r.id !== id);
    set({ routines: next });
    await persist(next);
    apiClient.delete(`/routine/${id}`).catch(() => {});
  },

  shareRoutine: async (id) => {
    const res = await apiClient.post(`/routine/${id}/share`);
    const updated: Routine = res.data;
    const next = get().routines.map(r =>
      r.id === id ? { ...r, isPublic: true, shareCode: updated.shareCode } : r
    );
    set({ routines: next });
    await persist(next);
  },

  unshareRoutine: async (id) => {
    await apiClient.delete(`/routine/${id}/share`);
    const next = get().routines.map(r =>
      r.id === id ? { ...r, isPublic: false } : r
    );
    set({ routines: next });
    await persist(next);
  },

  fetchPublicRoutines: async (sort = 'latest') => {
    const res = await apiClient.get('/routine/explore', { params: { sort } });
    set({ publicRoutines: res.data });
  },

  copyRoutine: async (id) => {
    const res = await apiClient.post(`/routine/${id}/copy`);
    const copied: Routine = res.data;
    const next = [...get().routines, copied];
    set({ routines: next });
    await persist(next);
  },

  searchByCode: async (code) => {
    const res = await apiClient.get(`/routine/code/${code.trim().toUpperCase()}`);
    return res.data as Routine;
  },

  combineRoutines: async (routineIds, name, exercises) => {
    const payload = exercises.map(({ gifUrl, ...rest }) => rest);
    try {
      const res = await apiClient.post('/routine/combine', { routineIds, name, exercises: payload });
      const routine: Routine = res.data;
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    } catch {
      const routine: Routine = { id: Date.now().toString(), name, exercises, createdAt: new Date().toISOString() };
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    }
  },

  reorderRoutines: async (ids) => {
    const currentRoutines = get().routines;
    const reordered = ids.map(id => currentRoutines.find(r => r.id === id)!).filter(Boolean);
    set({ routines: reordered });
    await persist(reordered);
    // await로 API 순서 저장 — catch하지 않으면 앱 재시작 시 서버 순서로 덮어써짐
    try {
      await apiClient.patch('/routine/reorder', { ids });
    } catch {}
  },

  reorderExercises: async (routineId, exercises) => {
    await get().updateRoutine(routineId, { exercises: exercises.map(({ gifUrl, ...rest }) => rest) });
  },

  updateRoutineFromSession: async (routineId, session) => {
    const exercises: RoutineExercise[] = session.exercises.map(ex => {
      const validSets = ex.sets.filter(s => s.weight > 0 || s.reps > 0);
      const unit = (validSets[0]?.unit as 'kg' | 'lbs' | undefined) ?? 'kg';
      return {
        name: ex.name,
        category: ex.category,
        defaultSets: ex.sets.length || 3,
        defaultWeight: validSets.length > 0 ? Math.max(...validSets.map(s => s.weight)) : 0,
        defaultUnit: unit,
        defaultReps: validSets[0]?.reps,
        isSingleArm: ex.isSingleArm ?? false,
        restSeconds: ex.restSeconds,
        targetReps: ex.targetReps,
        settings: ex.settings,
        tip: ex.tip,
        targetMuscles: ex.targetMuscles,
      };
    });
    await get().updateRoutine(routineId, { exercises });
  },
}));
