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
  /** 로그아웃·탈퇴 시 호출. lib/accountCache.ts 참조. */
  reset: () => void;
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

  /** 로그아웃·탈퇴 시 메모리 상태를 비운다. lib/accountCache.ts 참조. */
  reset: () => set({ data: { weightHistory: [] }, isLoading: false, error: null }),
}));
