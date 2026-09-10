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

/**
 * 목록의 종목에 붙는 임시 키. React 리스트 key 와 드래그 정렬에 쓰인다.
 * 저장할 때는 떼어 낸다. 진입할 때마다 새로 붙으므로 **dirty 비교에서 제외**한다.
 */
export type ExerciseDraft = RoutineExercise & { key: string };

/** 합치기 화면에서만 필요한 출처 표시. */
export type CombineExercise = ExerciseDraft & {
  fromRoutineName: string;
  isDuplicate: boolean;
};

/**
 * 작성 중인 루틴. **라우트 밖에 산다.**
 *
 * ── 왜 스토어인가 ─────────────────────────────────────────────────────────
 * 루틴 작성은 여러 화면을 오간다(편집 → 종목 추가 → 편집). 라우트가 갈리면
 * 화면끼리 상태를 직접 넘길 수 없다. params 로 넘기기엔 `exercises` 가 크고
 * (종목 10개면 수 KB), Context 로 두면 라우트를 벗어날 때 Provider 가
 * 언마운트되어 **초안이 사라진다** — 미저장 가드가 지키려는 것과 충돌한다.
 *
 * ── 종목 추가의 복귀 경로 ─────────────────────────────────────────────────
 * 전에는 부모가 `onAdd` 콜백으로 자기 `setExercises` 를 불렀다. 라우트가
 * 갈리면 콜백을 넘길 수 없으므로 **단방향**으로 바꾼다:
 *   종목 화면이 `addDraftExercise` 를 부르고 `router.back()`,
 *   편집 화면은 `draft.exercises` 를 구독하고 있어 자동으로 반영된다.
 */
export type RoutineDraft = {
  kind: 'create' | 'edit' | 'combine';
  /** edit 대상 루틴 id. create·combine 이면 null. */
  id: string | null;
  name: string;
  color: string;
  exercises: ExerciseDraft[];
  /** combine 의 원본 루틴 ids. 저장할 때 서버로 보낸다. */
  sourceIds: string[];
  /**
   * 진입 시점의 서명. dirty 판정 기준이다.
   *
   * edit·combine 은 기존 값이 채워진 채 열리므로 "값이 있는가"로 판정하면
   * 열자마자 dirty 가 된다. 진입 시점을 찍어 두고 그것과 비교한다.
   */
  snapshot: string;
};

interface RoutineStore {
  routines: Routine[];
  /** 로그아웃·탈퇴 시 호출. lib/accountCache.ts 참조. */
  reset: () => void;
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

  /** 작성 중인 루틴. 없으면 null. */
  draft: RoutineDraft | null;
  /** 초안을 새로 연다. **기존 초안이 있으면 덮어쓴다.** */
  beginDraft: (init: Omit<RoutineDraft, 'snapshot'>) => void;
  /** 이름·색 등 부분 갱신. */
  patchDraft: (partial: Partial<Omit<RoutineDraft, 'snapshot'>>) => void;
  /** 종목 추가 화면이 부른다. */
  addDraftExercise: (ex: RoutineExercise) => void;
  /** 종목 편집 화면이 부른다. */
  updateDraftExercise: (index: number, ex: RoutineExercise) => void;
  removeDraftExercise: (index: number) => void;
  /** 드래그 정렬 결과 반영. */
  setDraftExercises: (exercises: ExerciseDraft[]) => void;
  /** 저장 성공 또는 가드 통과 후 이탈에서 부른다. */
  clearDraft: () => void;
  /** 진입 시점 서명과 지금이 다른가. 초안이 없으면 false. */
  isDraftDirty: () => boolean;
}

// v2: 이전 버전과 스키마 충돌 방지를 위해 키 버전 관리
/**
 * 서버에서 온 루틴의 종목을 앱이 기대하는 형태로 맞춘다.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * `routines.exercises` 는 서버에서 **jsonb** 다(routine.entity.ts). 컬럼 타입이
 * 구조를 강제하지 않아 클라이언트가 보낸 것이 그대로 들어간다. 필드가 빠지거나
 * 타입이 어긋난 행이 실제로 존재할 수 있고, 그런 행이 화면까지 내려오면
 * `defaultSets` 가 undefined 인 채로 계산에 들어가 **NaN 이 그대로 렌더된다**
 * (`0종목 · 예상 NaN분`). JSX 는 undefined 를 아무것도 그리지 않으므로 칩도
 * "벤치프레스 s" 처럼 단위만 남는다.
 *
 * 표시하는 쪽마다 `?? 3` 을 흩뿌리는 대신 **데이터가 앱에 들어오는 이 한 곳**
 * 에서 맞춘다. 소비자가 늘어도 같은 보장을 받는다.
 *
 * 폴백 3은 `buildSetsFromRoutineExercise`(workoutStore)가 쓰는 값과 같다 —
 * 화면이 "3세트"라고 말하면 실제로 시작했을 때도 3세트가 나와야 한다.
 */
const normalizeExercise = (ex: RoutineExercise): RoutineExercise => {
  // sets 는 객체 배열이어야 한다. 숫자 같은 다른 타입이 들어와 있으면 버린다 —
  // 남겨 두면 `sets.length` 가 undefined 라 소비하는 쪽이 조용히 빗나간다.
  const sets = Array.isArray(ex.sets) ? ex.sets : undefined;
  const declared = Number(ex.defaultSets);
  const defaultSets =
    Number.isFinite(declared) && declared > 0
      ? declared
      : sets && sets.length > 0
        ? sets.length
        : 3;
  return { ...ex, sets, defaultSets };
};

const normalizeRoutines = (list: Routine[]): Routine[] =>
  (Array.isArray(list) ? list : []).map((r) => ({
    ...r,
    exercises: (Array.isArray(r.exercises) ? r.exercises : []).map(normalizeExercise),
  }));

const STORAGE_KEY = 'routines:v2';

/** 변경된 루틴 목록을 AsyncStorage에 저장 (서버 실패 시 폴백 데이터 역할) */
/**
 * 초안의 dirty 판정용 서명.
 *
 * `key` 는 진입할 때마다 `Date.now()` 로 새로 붙는 값이라 비교에서 뺀다 —
 * 넣으면 아무것도 안 바꿔도 항상 dirty 가 된다.
 * `combine` 의 `fromRoutineName`·`isDuplicate` 도 표시 전용이라 뺀다.
 */
const draftSignature = (d: Omit<RoutineDraft, 'snapshot'>): string =>
  JSON.stringify({
    name: d.name.trim(),
    color: d.color,
    exs: d.exercises.map(({ key, ...rest }) => {
      const { fromRoutineName, isDuplicate, ...plain } = rest as Record<string, unknown>;
      return plain;
    }),
  });

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
      const routines = normalizeRoutines(res.data);
      set({ routines, loaded: true });
      // 서버 데이터를 캐시에도 저장 — 다음 오프라인 폴백용
      await persist(routines);
    } catch {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        // 캐시도 같은 정규화를 거친다 — 어긋난 데이터가 저장된 뒤 폴백으로
        // 되살아나는 경로를 막는다.
        if (raw) set({ routines: normalizeRoutines(JSON.parse(raw)), loaded: true });
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

  /** 로그아웃·탈퇴 시 메모리 상태를 비운다. lib/accountCache.ts 참조. */
  /**
   * ── 초안 ──────────────────────────────────────────────────────────────
   *
   * ★ **`persist()` 에 draft 를 넣지 말 것.**
   *
   * `persist` 는 `routines` 만 AsyncStorage 에 저장한다. 초안은 **의도적으로
   * 휘발**시킨다 — 앱을 재시작하면 사라진다.
   *
   * 운동 세션 초안(`workout_draft`, workoutStore)은 반대로 영속화한다.
   * 운동 중 앱이 죽으면 세트 기록이 날아가는 게 치명적이기 때문이다.
   * 루틴 작성은 몇 분짜리 작업이고, 되살아난 초안이 **어느 루틴을 편집하던
   * 것인지** 사용자가 기억하지 못하면 오히려 위험하다 — edit 초안이 되살아나
   * 엉뚱한 루틴에 저장될 수 있다.
   *
   * 나중에 "초안도 저장하자"는 판단이 서면 그때 이 주석을 지우고 옮길 것.
   * 지금 persist 목록에 무심코 추가하면 위 위험이 생긴다.
   */
  draft: null,

  beginDraft: (init) =>
    set({ draft: { ...init, snapshot: draftSignature(init) } }),

  patchDraft: (partial) =>
    set((s) => (s.draft ? { draft: { ...s.draft, ...partial } } : {})),

  addDraftExercise: (ex) =>
    set((s) =>
      s.draft
        ? {
            draft: {
              ...s.draft,
              exercises: [
                ...s.draft.exercises,
                { ...ex, key: `${ex.name}-${Date.now()}` },
              ],
            },
          }
        : {},
    ),

  updateDraftExercise: (index, ex) =>
    set((s) =>
      s.draft
        ? {
            draft: {
              ...s.draft,
              exercises: s.draft.exercises.map((prev, i) =>
                // key 는 유지한다 — 바꾸면 리스트가 통째로 다시 그려지고
                // 드래그 중이던 항목이 튄다.
                i === index ? { ...ex, key: prev.key } : prev,
              ),
            },
          }
        : {},
    ),

  removeDraftExercise: (index) =>
    set((s) =>
      s.draft
        ? { draft: { ...s.draft, exercises: s.draft.exercises.filter((_, i) => i !== index) } }
        : {},
    ),

  setDraftExercises: (exercises) =>
    set((s) => (s.draft ? { draft: { ...s.draft, exercises } } : {})),

  clearDraft: () => set({ draft: null }),

  isDraftDirty: () => {
    const d = get().draft;
    if (!d) return false;
    const { snapshot, ...rest } = d;
    return draftSignature(rest) !== snapshot;
  },

  // 로그아웃·탈퇴는 초안도 버린다 — 다음 계정에 남으면 안 된다.
  reset: () => set({ routines: [], publicRoutines: [], loaded: false, draft: null }),
}));
