import { create } from 'zustand';
import apiClient from '../lib/apiClient';

interface FavoriteFood {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
}

interface FavoriteStore {
  favorites: FavoriteFood[];
  fetchFavorites: () => Promise<void>;
  addFavorite: (food: Omit<FavoriteFood, 'id'>) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (foodName: string) => boolean;
}

export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  favorites: [],

  fetchFavorites: async () => {
    try {
      const res = await apiClient.get('/favorites');
      set({ favorites: res.data });
    } catch (e) {
      console.error('즐겨찾기 불러오기 실패', e);
    }
  },

  addFavorite: async (food) => {
    try {
      const res = await apiClient.post('/favorites', food);
      set(s => ({ favorites: [res.data, ...s.favorites] }));
    } catch (e) {
      console.error('즐겨찾기 추가 실패', e);
    }
  },

  removeFavorite: async (id) => {
    try {
      await apiClient.delete('/favorites/' + id);
      set(s => ({ favorites: s.favorites.filter(f => f.id !== id) }));
    } catch (e) {
      console.error('즐겨찾기 삭제 실패', e);
    }
  },

  isFavorite: (foodName) => {
    return get().favorites.some(f => f.foodName === foodName);
  },
}));
