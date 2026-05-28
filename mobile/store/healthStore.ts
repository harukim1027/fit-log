import { create } from 'zustand';
import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import apiClient from '../lib/apiClient';

// HealthKit은 iOS 네이티브 빌드에서만 동작함 (Expo Go 불가)
const isHealthKitAvailable = Platform.OS === 'ios';

const PERMISSIONS: HealthKitPermissions = {
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

export interface HealthData {
  weight?: number;        // kg
  bodyFat?: number;       // % (0–100)
  leanBodyMass?: number;  // kg
  height?: number;        // cm
  weightHistory: { date: string; value: number }[];
}

interface HealthStore {
  data: HealthData;
  isLoading: boolean;
  isAuthorized: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  fetchHealthData: () => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  data: { weightHistory: [] },
  isLoading: false,
  isAuthorized: false,
  error: null,

  requestPermissions: () =>
    new Promise<boolean>((resolve) => {
      if (!isHealthKitAvailable) { resolve(false); return; }
      AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
        if (err) {
          set({ error: 'HealthKit 권한 요청 실패', isAuthorized: false });
          resolve(false);
        } else {
          set({ isAuthorized: true, error: null });
          resolve(true);
        }
      });
    }),

  fetchHealthData: async () => {
    if (!isHealthKitAvailable) return;

    set({ isLoading: true, error: null });

    const authorized =
      get().isAuthorized || (await get().requestPermissions());
    if (!authorized) {
      set({ isLoading: false });
      return;
    }

    const data: HealthData = { weightHistory: [] };

    // 체중: gram 단위 → kg
    await new Promise<void>((resolve) => {
      AppleHealthKit.getLatestWeight(
        { unit: AppleHealthKit.Constants.Units.gram },
        (err, result) => {
          if (!err && result?.value) {
            data.weight = Math.round((result.value / 1000) * 10) / 10;
          }
          resolve();
        },
      );
    });

    // 체지방률: percent 단위 → 0-100
    await new Promise<void>((resolve) => {
      AppleHealthKit.getLatestBodyFatPercentage(
        { unit: AppleHealthKit.Constants.Units.percent },
        (err, result) => {
          if (!err && result?.value != null) {
            // HealthKit은 0-1 ratio 반환; percent unit은 *100 변환 적용됨
            data.bodyFat = Math.round(result.value * 10) / 10;
          }
          resolve();
        },
      );
    });

    // 근육량(제지방량): gram 단위 → kg
    await new Promise<void>((resolve) => {
      AppleHealthKit.getLatestLeanBodyMass(
        { unit: AppleHealthKit.Constants.Units.gram },
        (err, result) => {
          if (!err && result?.value) {
            data.leanBodyMass = Math.round((result.value / 1000) * 10) / 10;
          }
          resolve();
        },
      );
    });

    // 키: meter 단위 → cm
    await new Promise<void>((resolve) => {
      AppleHealthKit.getLatestHeight(
        { unit: AppleHealthKit.Constants.Units.meter },
        (err, result) => {
          if (!err && result?.value) {
            data.height = Math.round(result.value * 100);
          }
          resolve();
        },
      );
    });

    // 체중 추이: 최근 30일
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    await new Promise<void>((resolve) => {
      AppleHealthKit.getWeightSamples(
        {
          unit: AppleHealthKit.Constants.Units.gram,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          ascending: true,
          limit: 30,
        },
        (err, results) => {
          if (!err && Array.isArray(results)) {
            data.weightHistory = results.map((r) => ({
              date: (r.startDate ?? '').split('T')[0],
              value: Math.round((r.value / 1000) * 10) / 10,
            }));
          }
          resolve();
        },
      );
    });

    set({ data, isLoading: false });

    // 체중·키를 백엔드에 동기화
    const patch: Record<string, number> = {};
    if (data.weight) patch.weight = data.weight;
    if (data.height) patch.height = data.height;
    if (Object.keys(patch).length > 0) {
      try { await apiClient.patch('/users/me', patch); } catch {}
    }
  },
}));
