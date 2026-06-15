/**
 * @file store/routineStore.ts
 * @description 루틴(운동 템플릿) 전역 상태 관리 (Zustand)
 *
 * 핵심 패턴 — Optimistic Update(낙관적 업데이트):
 * 로컬 상태 즉시 변경 → AsyncStorage 저장 → 서버 요청 순서로 진행한다.
 * 사용자는 네트워크 응답을 기다리지 않고 바로 UI 변화를 체감하고,
 * 서버 실패 시에도 캐시에 저장되어 다음 앱 실행 시 재시도 가능하다.
 *
 * 오프라인 지원:
 * - loadRoutines 실패 시 AsyncStorage 캐시에서 복원
 * - addRoutine 실패 시 임시 ID로 로컬 저장 (서버와 ID 불일치 가능성 있음)
 */

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
  /** 세트 수 기본값 — sets 배열이 없을 때 운동 세션 시작 시 이 수만큼 빈 세트 생성 */
  defaultSets: number;
  defaultWeight?: number;
  defaultUnit?: 'kg' | 'lbs';
  defaultReps?: number;
  /** 구체적인 목표 세트 목록 (무게/횟수 지정 시 사용) */
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
  /** 공유 코드 — 다른 사용자가 코드 입력으로 루틴 복사 가능 */
  shareCode?: string;
  copyCount?: number;
  authorName?: string;
  /** 통계 차트 루틴별 색상 (hex). 생성 시 자동 할당, 사용자가 변경 가능. */
  color?: string;
}

// 루틴 자동 색상 풀 (백엔드 routine.service의 ROUTINE_COLOR_POOL과 동일 순서)
export const ROUTINE_COLOR_POOL = [
  '#F07A95', // 분홍
  '#2E82F0', // 파랑
  '#4FA98C', // 초록
  '#9B7EDE', // 보라
  '#E89B4F', // 주황
  '#54B0C4', // 청록
  '#D97AB8', // 자홍
  '#7C8B3D', // 올리브
];

/** 안 쓰인 색상 우선, 다 쓰면 개수 기준 순환 */
export const getNextRoutineColor = (existing: Routine[]): string => {
  const used = existing.map((r) => r.color).filter(Boolean);
  const unused = ROUTINE_COLOR_POOL.find((c) => !used.includes(c));
  return unused ?? ROUTINE_COLOR_POOL[existing.length % ROUTINE_COLOR_POOL.length];
};

interface RoutineStore {
  routines: Routine[];
  publicRoutines: Routine[];
  /** 최초 로드 완료 여부 — 중복 로드 방지에 사용 */
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

// v2: 이전 버전과 스키마 충돌 방지를 위해 키 버전 관리
const STORAGE_KEY = 'routines:v2';

/** 변경된 루틴 목록을 AsyncStorage에 저장 (서버 실패 시 폴백 데이터 역할) */
const persist = async (routines: Routine[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
};

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  routines: [],
  publicRoutines: [],
  loaded: false,

  /**
   * 서버에서 루틴 목록을 가져온다.
   * 네트워크 실패 시 AsyncStorage 캐시로 폴백해 오프라인에서도 루틴 사용 가능.
   */
  loadRoutines: async () => {
    try {
      const res = await apiClient.get('/routine');
      const routines: Routine[] = res.data;
      set({ routines, loaded: true });
      // 서버 데이터를 캐시에도 저장 — 다음 오프라인 폴백용
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

  /**
   * 루틴을 추가한다.
   * 서버 실패 시 Date.now()로 임시 ID를 발급해 로컬에 저장한다.
   * 임시 ID는 서버 ID와 다를 수 있어 다음 loadRoutines 시 서버 데이터로 교체된다.
   */
  addRoutine: async (data) => {
    // 색상 미지정 시 자동 할당 (오프라인 폴백에서도 색이 보이도록 클라이언트에서 결정)
    const payload = { ...data, color: data.color ?? getNextRoutineColor(get().routines) };
    try {
      const res = await apiClient.post('/routine', payload);
      const routine: Routine = res.data;
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    } catch {
      // 오프라인 폴백: 임시 ID로 로컬 저장
      const routine: Routine = {
        ...payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    }
  },

  /**
   * Optimistic Update 패턴:
   * 로컬 → 캐시 → 서버 순서로 반영해 네트워크 지연 없이 즉각적인 UX를 제공한다.
   * 서버 저장이 실패해도 로컬 상태와 캐시는 이미 업데이트된 상태.
   */
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

  /**
   * 루틴을 즉시 로컬에서 제거하고 서버 삭제는 비동기로 처리한다.
   * fire-and-forget: 사용자는 삭제 응답을 기다리지 않는다.
   * 서버 삭제 실패 시 다음 loadRoutines에서 서버 데이터로 복원됨.
   */
  deleteRoutine: async (id) => {
    const next = get().routines.filter(r => r.id !== id);
    set({ routines: next });
    await persist(next);
    apiClient.delete(`/routine/${id}`).catch(() => {});
  },

  /** 공유 활성화 — 서버가 shareCode를 생성해 반환 */
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

  /** 공유 코드를 대문자로 정규화해 검색 — 사용자가 소문자로 입력해도 찾을 수 있게 */
  searchByCode: async (code) => {
    const res = await apiClient.get(`/routine/code/${code.trim().toUpperCase()}`);
    return res.data as Routine;
  },

  /**
   * 루틴 순서를 변경한다.
   * ids 배열 순서대로 routines를 재정렬하므로, 서버와 로컬 순서가 항상 일치한다.
   */
  reorderRoutines: async (ids) => {
    const currentRoutines = get().routines;
    const reordered = ids.map(id => currentRoutines.find(r => r.id === id)!).filter(Boolean);
    set({ routines: reordered });
    await persist(reordered);
    try {
      await apiClient.patch('/routine/reorder', { ids });
    } catch {}
  },

  reorderExercises: async (routineId, exercises) => {
    // gifUrl은 서버에 저장하지 않는 클라이언트 전용 필드 — 전송 전 제거
    await get().updateRoutine(routineId, { exercises: exercises.map(({ gifUrl, ...rest }) => rest) });
  },

  /**
   * 실제 운동 수행 결과로 루틴을 업데이트한다.
   * "지난번에 이 무게로 했으니 오늘도 이 무게로 시작" 기능의 핵심.
   *
   * 세트별 무게/횟수를 sets(RoutineSet[])에 그대로 보존한다.
   * 예전처럼 단일 defaultWeight(max)/defaultReps(첫 세트)로 합치면, 세트마다 다르게
   * 수행한 무게/횟수가 다음 시작 때 같은 값으로 뭉개진다.
   * defaultWeight/defaultReps는 목록 카드 표시용 대표값으로만 남긴다(세트 생성은 sets 우선).
   */
  updateRoutineFromSession: async (routineId, session) => {
    const exercises: RoutineExercise[] = session.exercises.map(ex => {
      const unit = (ex.sets[0]?.unit as 'kg' | 'lbs' | undefined) ?? 'kg';
      const sets: RoutineSet[] = ex.sets.map((s, i) => ({
        setNumber: i + 1,
        targetWeight: s.weight,
        targetReps: s.reps,
        unit: (s.unit as 'kg' | 'lbs' | undefined) ?? 'kg',
      }));
      return {
        name: ex.name,
        category: ex.category,
        defaultSets: ex.sets.length || 3,
        defaultWeight: ex.sets[0]?.weight,
        defaultReps: ex.sets[0]?.reps,
        defaultUnit: unit,
        sets,
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

  /**
   * 여러 루틴의 운동을 합쳐 새 루틴을 만든다.
   * gifUrl은 클라이언트 전용 필드라 서버 전송 전 제거.
   */
  combineRoutines: async (routineIds, name, exercises) => {
    const payload = exercises.map(({ gifUrl, ...rest }) => rest);
    try {
      const res = await apiClient.post('/routine/combine', { routineIds, name, exercises: payload });
      const routine: Routine = res.data;
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    } catch {
      // 오프라인 폴백
      const routine: Routine = { id: Date.now().toString(), name, exercises, createdAt: new Date().toISOString(), color: getNextRoutineColor(get().routines) };
      const next = [...get().routines, routine];
      set({ routines: next });
      await persist(next);
    }
  },
}));
