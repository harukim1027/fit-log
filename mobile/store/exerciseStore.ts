import { create } from 'zustand';
import apiClient from '../lib/apiClient';

export interface ExerciseResult {
  id: string;
  name: string;
  nameKo: string;
  bodyPart: string;
  bodyPartKo: string;
  target: string;
  targetKo: string;
  equipment: string;
  equipmentKo: string | null;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl: string;
  met: number;
  caloriesPerMinute: number;
  difficulty: string;
  difficultyKo: string | null;
  isCustom?: boolean;
}

interface ExerciseStore {
  results: ExerciseResult[];
  isSearching: boolean;
  error: string | null;
  cache: Map<string, ExerciseResult[]>;
  searchExercises: (query: string) => Promise<void>;
  getByBodyPart: (part: string) => Promise<void>;
  getList: (page?: number) => Promise<void>;
  clearResults: () => void;
  saveCustomExercise: (name: string, category: string) => Promise<ExerciseResult | null>;
}

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  results: [],
  isSearching: false,
  error: null,
  cache: new Map(),

  searchExercises: async (query: string) => {
    if (!query.trim()) return;
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cached = get().cache.get(cacheKey);
    if (cached) {
      set({ results: cached, isSearching: false });
      return;
    }
    set({ isSearching: true, error: null });
    try {
      const res = await apiClient.get<ExerciseResult[]>('/exercise/search', {
        params: { q: query },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      get().cache.set(cacheKey, data);
      set({ results: data, isSearching: false });
    } catch {
      set({ isSearching: false, error: '검색 중 오류가 발생했어요' });
    }
  },

  getByBodyPart: async (part: string) => {
    if (!part) return;
    const cacheKey = `bodypart:${part.toLowerCase()}`;
    const cached = get().cache.get(cacheKey);
    if (cached) {
      set({ results: cached, isSearching: false });
      return;
    }
    set({ isSearching: true, error: null });
    try {
      const res = await apiClient.get<ExerciseResult[]>('/exercise/bodypart', {
        params: { part },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      get().cache.set(cacheKey, data);
      set({ results: data, isSearching: false });
    } catch {
      set({ isSearching: false, error: '데이터를 불러오는 중 오류가 발생했어요' });
    }
  },

  getList: async (page = 1) => {
    const cacheKey = `list:${page}`;
    const cached = get().cache.get(cacheKey);
    if (cached) {
      set({ results: cached, isSearching: false });
      return;
    }
    set({ isSearching: true, error: null });
    try {
      const res = await apiClient.get<{ data: ExerciseResult[] }>('/exercise/list', {
        params: { page },
      });
      const data = res.data?.data ?? [];
      get().cache.set(cacheKey, data);
      set({ results: data, isSearching: false });
    } catch {
      set({ isSearching: false, error: '데이터를 불러오는 중 오류가 발생했어요' });
    }
  },

  clearResults: () => set({ results: [], error: null }),

  saveCustomExercise: async (name: string, category: string) => {
    try {
      const res = await apiClient.post<ExerciseResult>('/exercise/custom', { name, category, nameKo: name });
      return res.data;
    } catch {
      return null;
    }
  },
}));
