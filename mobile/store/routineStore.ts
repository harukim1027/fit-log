import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';

export interface RoutineExercise {
  name: string;
  category: string;
  defaultSets: number;
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
    apiClient.patch(`/routine/${id}`, data).catch(() => {});
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
}));
