import { create } from 'zustand';
import { Platform } from 'react-native';
import apiClient from '../lib/apiClient';

// react-native-health은 Expo Go에서 네이티브 모듈이 링크되지 않아 런타임 에러 발생
// 실제 기기 빌드(expo prebuild + expo run:ios)에서만 동작함
let AppleHealthKit: any = null;

try {
  if (Platform.OS === 'ios') {
    AppleHealthKit = require('react-native-health').default;
    // Constants에 접근해서 실제로 네이티브 모듈이 있는지 확인
    void AppleHealthKit?.Constants?.Permissions?.BodyMass;
  }
} catch {
  AppleHealthKit = null;
}

const isHealthKitAvailable = Platform.OS === 'ios' && AppleHealthKit != null;

function buildPermissions() {
  return {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.BodyMass,
        AppleHealthKit.Constants.Permissions.BodyFatPercentage,
        AppleHealthKit.Constants.Permissions.LeanBodyMass,
        AppleHealthKit.Constants.Permissions.Height,
      ],
      write: [],
    },
  };
}

export interface HealthData {
  weight?: number;
  bodyFat?: number;
  leanBodyMass?: number;
  height?: number;
  weightHistory: { date: string; value: number }[];
}

interface HealthStore {
  data: HealthData;
  isLoading: boolean;
  isAuthorized: boolean;
  isAvailable: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  fetchHealthData: () => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  data: { weightHistory: [] },
  isLoading: false,
  isAuthorized: false,
  isAvailable: isHealthKitAvailable,
  error: null,

  requestPermissions: () =>
    new Promise<boolean>((resolve) => {
      if (!isHealthKitAvailable) { resolve(false); return; }
      if (!AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') { resolve(false); return; }
      try {
        AppleHealthKit.initHealthKit(buildPermissions(), (err: any) => {
          if (err) {
            set({ error: 'HealthKit 권한 요청 실패', isAuthorized: false });
            resolve(false);
          } else {
            set({ isAuthorized: true, error: null });
            resolve(true);
          }
        });
      } catch {
        set({ error: 'HealthKit 초기화 실패', isAuthorized: false });
        resolve(false);
      }
    }),

  fetchHealthData: async () => {
    if (!isHealthKitAvailable) return;

    set({ isLoading: true, error: null });

    try {
      const authorized =
        get().isAuthorized || (await get().requestPermissions());
      if (!authorized) {
        set({ isLoading: false });
        return;
      }

      const data: HealthData = { weightHistory: [] };

      // 체중: gram → kg
      await new Promise<void>((resolve) => {
        try {
          AppleHealthKit.getLatestWeight(
            { unit: AppleHealthKit.Constants.Units.gram },
            (err: any, result: any) => {
              if (!err && result?.value) {
                data.weight = Math.round((result.value / 1000) * 10) / 10;
              }
              resolve();
            },
          );
        } catch { resolve(); }
      });

      // 체지방률
      await new Promise<void>((resolve) => {
        try {
          AppleHealthKit.getLatestBodyFatPercentage(
            { unit: AppleHealthKit.Constants.Units.percent },
            (err: any, result: any) => {
              if (!err && result?.value != null) {
                data.bodyFat = Math.round(result.value * 10) / 10;
              }
              resolve();
            },
          );
        } catch { resolve(); }
      });

      // 근육량(제지방량): gram → kg
      await new Promise<void>((resolve) => {
        try {
          AppleHealthKit.getLatestLeanBodyMass(
            { unit: AppleHealthKit.Constants.Units.gram },
            (err: any, result: any) => {
              if (!err && result?.value) {
                data.leanBodyMass = Math.round((result.value / 1000) * 10) / 10;
              }
              resolve();
            },
          );
        } catch { resolve(); }
      });

      // 키: meter → cm
      await new Promise<void>((resolve) => {
        try {
          AppleHealthKit.getLatestHeight(
            { unit: AppleHealthKit.Constants.Units.meter },
            (err: any, result: any) => {
              if (!err && result?.value) {
                data.height = Math.round(result.value * 100);
              }
              resolve();
            },
          );
        } catch { resolve(); }
      });

      // 체중 추이: 최근 30일
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      await new Promise<void>((resolve) => {
        try {
          AppleHealthKit.getWeightSamples(
            {
              unit: AppleHealthKit.Constants.Units.gram,
              startDate: startDate.toISOString(),
              endDate: new Date().toISOString(),
              ascending: true,
              limit: 30,
            },
            (err: any, results: any[]) => {
              if (!err && Array.isArray(results)) {
                data.weightHistory = results.map((r) => ({
                  date: (r.startDate ?? '').split('T')[0],
                  value: Math.round((r.value / 1000) * 10) / 10,
                }));
              }
              resolve();
            },
          );
        } catch { resolve(); }
      });

      set({ data, isLoading: false });

      // 체중·키 백엔드 동기화
      const patch: Record<string, number> = {};
      if (data.weight) patch.weight = data.weight;
      if (data.height) patch.height = data.height;
      if (Object.keys(patch).length > 0) {
        try { await apiClient.patch('/users/me', patch); } catch {}
      }
    } catch {
      set({ isLoading: false, error: 'HealthKit 데이터 불러오기 실패' });
    }
  },
}));
