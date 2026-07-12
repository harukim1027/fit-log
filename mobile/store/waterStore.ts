import { create } from 'zustand';
import apiClient from '../lib/apiClient';
import { localDateStr } from '../utils/date';

interface WaterStore {
  total: number;
  target: number;
  fetchTotal: (date?: string) => Promise<void>;
  addWater: (amount: number, date?: string) => Promise<void>;
  resetWater: (date?: string) => Promise<void>;
}

const todayStr = () => localDateStr();

export const useWaterStore = create<WaterStore>((set) => ({
  total: 0,
  target: 2000,

  fetchTotal: async (date) => {
    const d = date ?? todayStr();
    try {
      const res = await apiClient.get('/water', { params: { date: d } });
      set({ total: res.data.total });
    } catch (e) {
      console.error('물 섭취량 불러오기 실패', e);
    }
  },

  addWater: async (amount, date) => {
    const d = date ?? todayStr();
    try {
      const res = await apiClient.post('/water', { date: d, amount });
      set({ total: res.data.total });
    } catch (e) {
      console.error('물 섭취 추가 실패', e);
    }
  },

  resetWater: async (date) => {
    const d = date ?? todayStr();
    try {
      await apiClient.delete('/water', { params: { date: d } });
      set({ total: 0 });
    } catch (e) {
      console.error('물 섭취 초기화 실패', e);
    }
  },
}));
