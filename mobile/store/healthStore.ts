import { create } from 'zustand';

export interface HealthData {
  weight?: number;
  bodyFat?: number;
  leanBodyMass?: number;
  height?: number;
  weightHistory: { date: string; value: number }[];
}

interface HealthStore {
  data: HealthData;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  setData: (partial: Partial<HealthData>) => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  data: { weightHistory: [] },
  isAvailable: false,
  isLoading: false,
  error: null,
  setData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
}));
