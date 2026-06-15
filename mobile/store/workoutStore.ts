/**
 * @file store/workoutStore.ts
 * @description 운동 세션 전역 상태 관리 (Zustand)
 *
 * 핵심 기능:
 * - 운동 세션 시작/종료/취소 (startSession / endSession / cancelSession)
 * - 종목·세트 CRUD (addExercise, addSet, updateSet, removeSet 등)
 * - AsyncStorage 임시저장 + 복원 (앱 강제 종료 후에도 세션 유지)
 * - 운동 히스토리 인메모리 캐시 (화면 이동마다 API 재요청 방지)
 * - MET 기반 칼로리 계산 (볼륨 기반보다 실제 에너지 소비에 가까움)
 *
 * 타이머 상태는 Zustand state가 아닌 모듈 변수로 관리하는 이유:
 * - setInterval 핸들은 직렬화 불가 → Zustand devtools / persist 미들웨어와 충돌
 * - 컴포넌트 리렌더 없이 정확한 시간 추적 가능
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Exercise, WorkoutSession, WorkoutSet } from "../types/workout";
import { Routine, RoutineExercise } from "./routineStore";
import apiClient from "../lib/apiClient";
import { calcSessionVolume } from "../utils/workout";
import { logger } from "../lib/logger";

const WORKOUT_DRAFT_KEY = "workout_draft";

// 300ms 디바운스로 AsyncStorage 쓰기 최소화
// 세트 완료 시마다 즉시 쓰면 불필요한 I/O가 발생하고 애니메이션이 끊길 수 있다
let _draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 진행 중인 세션을 AsyncStorage에 임시저장한다.
 * 앱이 강제 종료돼도 다음 실행 시 restoreDraft()로 복원 가능.
 * session이 null이면 기존 임시저장 데이터를 삭제한다.
 */
const saveWorkoutDraft = (
  session: WorkoutSession | null,
  sessionStartTime: number | null,
  workoutElapsed: number,
) => {
  if (!session) {
    if (_draftSaveTimer) { clearTimeout(_draftSaveTimer); _draftSaveTimer = null; }
    AsyncStorage.removeItem(WORKOUT_DRAFT_KEY).catch(() => {});
    return;
  }
  if (_draftSaveTimer) clearTimeout(_draftSaveTimer);
  _draftSaveTimer = setTimeout(() => {
    AsyncStorage.setItem(
      WORKOUT_DRAFT_KEY,
      JSON.stringify({ session, sessionStartTime, workoutElapsed, savedAt: Date.now() }),
    ).catch(() => {});
  }, 300);
};

export type CompareMode = "recent" | "pr" | "week" | "month";

export interface ExerciseHistoryEntry {
  date: string;
  maxWeight: number;
  maxVolume: number;
  totalSets: number;
  sets: { weight: number; reps: number; unit?: string }[];
}

export interface ExerciseHistory {
  history: ExerciseHistoryEntry[];
  pr: { weight: number; volume: number; date: string } | null;
  comparisonSession: ExerciseHistoryEntry | null;
}

/**
 * 카테고리별 MET(대사당량) 값 반환
 *
 * MET는 안정 시 산소 소비량 대비 운동 강도.
 * 유산소: 7.0, 하체: 5.0, 그 외: 3.5 (일반 웨이트 기준)
 * 실제 임상 MET 값을 단순화한 추정치 — 정확한 측정이 아닌 합리적 근사.
 */
const getCategoryMET = (category: string): number => {
  const lower = category?.toLowerCase() ?? '';
  if (lower.includes('유산소') || lower.includes('cardio')) return 7.0;
  if (lower.includes('하체')) return 5.0;
  return 3.5;
};

/**
 * MET 공식으로 소모 칼로리를 추정한다: kcal = MET × 체중(kg) × 시간(h)
 *
 * 이전 볼륨 기반 공식(totalVolume × 0.1 × bodyWeightFactor)은 고중량 단순 운동에서
 * 칼로리를 지나치게 높게 계산했다. MET 기반이 실제 에너지 소비와 더 일치한다.
 *
 * @param session - 운동 세션 (종목별 카테고리 정보 사용)
 * @param weightKg - 사용자 체중 (kg)
 * @param durationMinutes - 운동 시간 (분)
 */
export const calculateCaloriesBurned = (
  session: WorkoutSession,
  weightKg: number,
  durationMinutes: number,
): number => {
  if (durationMinutes <= 0) return 0;
  const categories = session.exercises.map((ex) => ex.category ?? '');
  // 혼합 운동(웨이트 + 유산소) 시 종목별 MET를 평균냄
  const avgMET =
    categories.length > 0
      ? categories.reduce((sum, cat) => sum + getCategoryMET(cat), 0) / categories.length
      : 3.5;
  const hours = durationMinutes / 60;
  return Math.round(avgMET * weightKg * hours);
};

/**
 * 루틴 종목(RoutineExercise) → 운동 세션 세트(WorkoutSet[]) 변환.
 *
 * 루틴 → 세트 변환 로직이 여러 화면에 중복되면서, per-set 목표(`sets`)를
 * 처리하지 않는 복사본 때문에 "세트별 목표" 루틴의 무게/횟수가 0으로 떨어지는
 * 버그가 반복됐다. 단일 헬퍼로 통합해 모든 진입점이 동일하게 동작하도록 한다.
 *
 * 우선순위:
 * 1) 세트별 목표(sets)가 있으면 targetWeight/targetReps 사용
 * 2) 없으면 defaultSets 개수만큼 defaultWeight/defaultReps로 채움
 */
export const buildSetsFromRoutineExercise = (
  re: RoutineExercise,
  idPrefix: string,
): WorkoutSet[] => {
  if (re.sets && re.sets.length > 0) {
    return re.sets.map((rs, j) => ({
      id: `${idPrefix}-${j}`,
      weight: Number(rs.targetWeight ?? 0),
      reps: Number(rs.targetReps ?? 0),
      completed: false,
      unit: rs.unit ?? 'kg',
    }));
  }
  return Array.from({ length: re.defaultSets ?? 3 }, (_, j) => ({
    id: `${idPrefix}-${j}`,
    weight: Number(re.defaultWeight ?? 0),
    reps: Number(re.defaultReps ?? 0),
    completed: false,
    unit: re.defaultUnit ?? 'kg',
  }));
};

interface WorkoutStore {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  sessionStartTime: number | null;
  isLoading: boolean;
  /** 기록 캘린더에서 날짜 탭 시 히스토리 탭으로 점프할 날짜 (YYYY-MM-DD). 소비 후 null. */
  historyJumpDate: string | null;
  setHistoryJumpDate: (date: string | null) => void;
  exerciseHistoryCache: Map<string, ExerciseHistory>;
  workoutElapsed: number;
  workoutPaused: boolean;

  startSession: () => void;
  startSessionWithRoutine: (routine: Routine) => void;
  endSession: (caloriesBurned: number) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, "sets">) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateExercise: (exerciseId: string, data: Partial<Omit<Exercise, 'id' | 'sets'>>) => void;
  removeExercise: (exerciseId: string) => void;
  updateSession: (sessionId: string, exercises: WorkoutSession['exercises']) => Promise<void>;
  reorderSessionExercises: (exercises: Exercise[]) => void;
  getTodaySession: () => WorkoutSession | null;
  getTotalVolume: (session: WorkoutSession) => number;
  fetchSessions: () => Promise<void>;
  createSessionForDate: (date: string, exercises: WorkoutSession['exercises']) => Promise<void>;
  fetchExerciseHistory: (exerciseName: string, mode?: CompareMode) => Promise<ExerciseHistory | null>;

  cancelSession: () => void;
  restoreDraft: () => Promise<boolean>;
  setWorkoutElapsed: (v: number) => void;
  setWorkoutPaused: (v: boolean) => void;
  resetWorkoutTimer: () => void;
  startWorkoutTimer: () => void;
  stopWorkoutTimer: () => void;
}

const todayStr = () => new Date().toISOString().split("T")[0];

// 모듈 스코프 타이머 변수 — Zustand state에 넣으면 직렬화 문제 발생
let _workoutIntervalId: ReturnType<typeof setInterval> | null = null;
// 백그라운드에서도 정확한 시간 측정을 위해 "기준점 + 경과" 방식 사용
// (setInterval은 백그라운드에서 throttle되어 실제 시간보다 느려질 수 있음)
let _workoutTimerBase = 0;    // 현재 세그먼트 시작 시점 (Date.now())
let _workoutElapsedBase = 0;  // 현재 세그먼트 시작 시점의 누적 경과(초)

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  sessions: [],
  activeSession: null,
  sessionStartTime: null,
  isLoading: false,
  historyJumpDate: null,
  setHistoryJumpDate: (date) => set({ historyJumpDate: date }),
  exerciseHistoryCache: new Map(),
  workoutElapsed: 0,
  workoutPaused: false,

  /** 세션을 저장하지 않고 종료. 운동 도중 "그냥 나가기" 시 사용 */
  cancelSession: () => {
    get().stopWorkoutTimer();
    set({ activeSession: null, sessionStartTime: null, workoutElapsed: 0, workoutPaused: false });
    saveWorkoutDraft(null, null, 0);
  },

  /**
   * 앱 시작 시 AsyncStorage에서 미완성 세션을 복원한다.
   * 24시간 이내 데이터만 복원하는 이유:
   * 너무 오래된 임시저장은 사용자가 이미 잊었거나 의도적으로 종료한 것으로 판단.
   */
  restoreDraft: async () => {
    try {
      const raw = await AsyncStorage.getItem(WORKOUT_DRAFT_KEY);
      if (!raw) return false;
      const { session, sessionStartTime, workoutElapsed, savedAt } = JSON.parse(raw);
      const hoursSince = (Date.now() - savedAt) / 1000 / 60 / 60;
      if (hoursSince > 24) {
        await AsyncStorage.removeItem(WORKOUT_DRAFT_KEY);
        return false;
      }
      set({ activeSession: session, sessionStartTime, workoutElapsed: workoutElapsed ?? 0 });
      return true;
    } catch {
      return false;
    }
  },

  setWorkoutElapsed: (v) => set({ workoutElapsed: v }),

  /**
   * 일시정지 상태 전환.
   * 일시정지 시: 인터벌 중단 + 현재 경과 시간 고정
   * 재개 시: startWorkoutTimer()로 기준점을 새로 잡아 정확한 시간 이어서 측정
   */
  setWorkoutPaused: (v) => {
    set({ workoutPaused: v });
    if (v) {
      if (_workoutIntervalId) {
        clearInterval(_workoutIntervalId);
        _workoutIntervalId = null;
      }
      _workoutElapsedBase = get().workoutElapsed;
    } else {
      get().startWorkoutTimer();
    }
  },

  /** 타이머를 0부터 재시작. 세션 시작 시에도 사용 */
  resetWorkoutTimer: () => {
    if (_workoutIntervalId) {
      clearInterval(_workoutIntervalId);
      _workoutIntervalId = null;
    }
    _workoutElapsedBase = 0;
    _workoutTimerBase = Date.now();
    set({ workoutElapsed: 0, workoutPaused: false });
    _workoutIntervalId = setInterval(() => {
      const elapsed = _workoutElapsedBase + Math.floor((Date.now() - _workoutTimerBase) / 1000);
      set({ workoutElapsed: elapsed });
    }, 1000);
  },

  /**
   * 기준점 기반 타이머 시작.
   * Date.now() 차이로 경과 시간을 계산하므로 백그라운드에서 setInterval이 늦게 실행돼도
   * 화면 복귀 시 실제 경과 시간으로 보정된다.
   */
  startWorkoutTimer: () => {
    if (_workoutIntervalId) clearInterval(_workoutIntervalId);
    _workoutTimerBase = Date.now();
    _workoutElapsedBase = get().workoutElapsed;
    _workoutIntervalId = setInterval(() => {
      const elapsed = _workoutElapsedBase + Math.floor((Date.now() - _workoutTimerBase) / 1000);
      set({ workoutElapsed: elapsed });
    }, 1000);
  },

  stopWorkoutTimer: () => {
    if (_workoutIntervalId) {
      clearInterval(_workoutIntervalId);
      _workoutIntervalId = null;
    }
  },

  /** 빈 세션 생성. ID는 Date.now()로 발급해 시간순 정렬과 유일성을 동시에 보장 */
  startSession: () => {
    logger.info('운동 세션 시작');
    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: todayStr(),
      exercises: [],
      durationMinutes: 0,
      note: "",
    };
    const now = Date.now();
    set({
      activeSession: session,
      sessionStartTime: now,
      workoutElapsed: 0,
      workoutPaused: false,
    });
    get().startWorkoutTimer();
    saveWorkoutDraft(session, now, 0);
  },

  /**
   * 루틴을 기반으로 세션을 시작한다.
   * 루틴에 구체적인 sets(목표 무게/횟수)가 있으면 그것을 사용하고,
   * 없으면 defaultSets만큼 빈 세트를 생성한다.
   * 각 종목의 히스토리를 미리 fetch해 운동 카드에서 이전 기록과 비교할 수 있게 한다.
   */
  startSessionWithRoutine: (routine) => {
    const now = Date.now();
    const exercises: Exercise[] = routine.exercises.map((ex, i) => ({
      id: `${now}-${i}`,
      name: ex.name,
      category: ex.category,
      settings: ex.settings,
      tip: ex.tip,
      restSeconds: ex.restSeconds,
      targetReps: ex.targetReps,
      targetMuscles: ex.targetMuscles,
      isSingleArm: ex.isSingleArm ?? false,
      sets: buildSetsFromRoutineExercise(ex, `${now}-${i}`),
    }));
    const session: WorkoutSession = {
      id: now.toString(),
      date: todayStr(),
      exercises,
      durationMinutes: 0,
      note: "",
      fromRoutineId: routine.id,
    };
    set({
      activeSession: session,
      sessionStartTime: now,
      workoutElapsed: 0,
      workoutPaused: false,
    });
    get().startWorkoutTimer();
    saveWorkoutDraft(session, now, 0);
    // 운동 시작 후 백그라운드에서 히스토리 fetch — 운동 카드 렌더 전에 데이터 준비
    exercises.forEach((ex) => {
      get().fetchExerciseHistory(ex.name, "recent");
      get().fetchExerciseHistory(ex.name, "pr");
    });
  },

  deleteSession: async (id: string) => {
    try {
      await apiClient.delete(`/workout/${id}`);
      set((s) => ({ sessions: s.sessions.filter((s) => s.id !== id) }));
    } catch (e) {
      logger.error('운동 기록 삭제 실패', e instanceof Error ? e : new Error(String(e)));
    }
  },

  /**
   * 세션을 서버에 저장하고 완료 처리한다.
   * sessionStartTime 기준 durationMinutes를 계산해 저장하므로
   * handleEnd에서 별도로 계산하지 않아도 된다.
   */
  endSession: async (caloriesBurned: number) => {
    const active = get().activeSession;
    const startTime = get().sessionStartTime;
    if (!active) return;

    const durationMinutes = startTime
      ? Math.max(Math.round((Date.now() - startTime) / 60000), 1)
      : 0;

    logger.info('운동 세션 종료', {
      exercises: active.exercises.length,
      durationMinutes,
      caloriesBurned,
    });

    get().stopWorkoutTimer();
    set({ workoutElapsed: 0, workoutPaused: false });

    try {
      await apiClient.post("/workout", {
        date: active.date,
        durationMinutes,
        caloriesBurned,
        note: active.note,
        fromRoutineId: active.fromRoutineId ?? null,
        exercises: active.exercises.map((ex, idx) => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? "",
          isSingleArm: ex.isSingleArm ?? false,
          targetMuscles: ex.targetMuscles ?? [],
          restSeconds: ex.restSeconds ?? null,
          targetReps: ex.targetReps ?? "",
          order: idx,
          sets: ex.sets.map((st) => ({
            weight: st.weight,
            reps: st.reps,
            completed: st.completed,
            unit: st.unit ?? 'kg',
          })),
        })),
      });
      await get().fetchSessions();
    } catch (e) {
      logger.error('운동 저장 실패', e instanceof Error ? e : new Error(String(e)));
    }
    set({ activeSession: null, sessionStartTime: null });
    saveWorkoutDraft(null, null, 0);
  },

  /**
   * 세션에 운동 종목을 추가한다.
   * 추가와 동시에 히스토리를 비동기 fetch해 운동 카드 렌더 시점에 이전 기록 표시 준비.
   * fire-and-forget이라 실패해도 세트 추가 자체는 영향받지 않는다.
   */
  addExercise: (exercise) => {
    set((s) => {
      if (!s.activeSession) return s;
      const newEx: Exercise = { ...exercise, sets: [] };
      return {
        activeSession: {
          ...s.activeSession,
          exercises: [...s.activeSession.exercises, newEx],
        },
      };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
    get().fetchExerciseHistory(exercise.name, "recent");
    get().fetchExerciseHistory(exercise.name, "pr");
  },

  addSet: (exerciseId, workoutSet) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: [...ex.sets, workoutSet] }
              : ex
          ),
        },
      };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  /** 세트의 일부 필드만 업데이트. Partial<WorkoutSet>이므로 명시한 필드만 교체 */
  updateSet: (exerciseId, setId, data) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((st) =>
                    st.id === setId ? { ...st, ...data } : st
                  ),
                }
              : ex
          ),
        },
      };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  removeSet: (exerciseId, setId) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.filter((st) => st.id !== setId) }
              : ex
          ),
        },
      };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  updateExercise: (exerciseId, data) => {
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, ...data } : ex
          ),
        },
      };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  removeExercise: (exerciseId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.filter(ex => ex.id !== exerciseId),
        },
      };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  reorderSessionExercises: (exercises) => {
    set(s => {
      if (!s.activeSession) return s;
      return { activeSession: { ...s.activeSession, exercises } };
    });
    const s = get();
    saveWorkoutDraft(s.activeSession, s.sessionStartTime, s.workoutElapsed);
  },

  /**
   * 히스토리 운동 기록을 수정한다 (Optimistic Update).
   * 로컬 즉시 반영 → 서버 PATCH → 실패 시 서버 데이터로 롤백.
   * 롤백을 위해 실패 시 fetchSessions()를 재호출한다.
   */
  updateSession: async (sessionId, exercises) => {
    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === sessionId ? { ...sess, exercises } : sess
      ),
    }));
    try {
      await apiClient.patch(`/workout/${sessionId}`, {
        exercises: exercises.map((ex, idx) => ({
          name: ex.name,
          category: ex.category,
          settings: ex.settings ?? [],
          tip: ex.tip ?? '',
          isSingleArm: ex.isSingleArm ?? false,
          targetMuscles: ex.targetMuscles ?? [],
          restSeconds: ex.restSeconds ?? null,
          targetReps: ex.targetReps ?? "",
          order: idx,
          sets: ex.sets.map(st => ({
            weight: st.weight,
            reps: st.reps,
            completed: st.completed,
            unit: st.unit ?? 'kg',
          })),
        })),
      });
    } catch (e) {
      // 낙관적 업데이트 롤백
      await get().fetchSessions();
      console.error('운동 기록 수정 실패', e);
      throw e;
    }
  },

  /** 오늘 날짜의 세션 반환. activeSession이 오늘 것이면 그것을 우선 반환 */
  getTodaySession: () => {
    const today = todayStr();
    return get().sessions.find((s) => s.date === today) ?? get().activeSession;
  },

  /** calcSessionVolume의 래퍼 — store 외부에서 직접 유틸 함수를 임포트하지 않아도 됨 */
  getTotalVolume: (session) => calcSessionVolume(session),

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get("/workout");
      // order 필드 기준으로 운동 종목 정렬 — 서버가 이미 정렬해 주지 않는 경우 대비
      const sessions = (res.data as WorkoutSession[]).map(s => ({
        ...s,
        exercises: [...s.exercises].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
      }));
      set({ sessions, isLoading: false });
    } catch (e) {
      logger.error('운동 기록 불러오기 실패', e instanceof Error ? e : new Error(String(e)));
      set({ isLoading: false });
    }
  },

  createSessionForDate: async (date, exercises) => {
    await apiClient.post("/workout", {
      date,
      durationMinutes: 0,
      caloriesBurned: 0,
      note: "",
      exercises: exercises.map((ex, idx) => ({
        name: ex.name,
        category: ex.category,
        settings: ex.settings ?? [],
        tip: ex.tip ?? "",
        isSingleArm: ex.isSingleArm ?? false,
        targetMuscles: ex.targetMuscles ?? [],
        restSeconds: ex.restSeconds ?? null,
        targetReps: ex.targetReps ?? "",
        order: idx,
        sets: ex.sets.map((st) => ({
          weight: st.weight,
          reps: st.reps,
          completed: st.completed,
          unit: st.unit ?? 'kg',
        })),
      })),
    });
    await get().fetchSessions();
  },

  /**
   * 운동 히스토리를 인메모리 캐시로 관리한다.
   *
   * 캐시 키: "{exerciseName}:{mode}" (e.g. "벤치프레스:pr")
   * 캐시하는 이유: 운동 화면에서 종목마다 recent + pr 두 번 요청하고,
   * 화면 이동·재렌더마다 반복 호출되어 불필요한 API 트래픽이 발생한다.
   * Map은 세션 종료 시 자동 소멸 (앱 메모리에만 존재).
   */
  fetchExerciseHistory: async (exerciseName, mode = "recent") => {
    const cacheKey = `${exerciseName}:${mode}`;
    const cached = get().exerciseHistoryCache.get(cacheKey);
    if (cached) return cached;
    try {
      const res = await apiClient.get<ExerciseHistory>(
        "/workout/exercise-history",
        { params: { name: exerciseName, mode } }
      );
      const data = res.data;
      // Map 업데이트 시 기존 Map을 복사해 새 Map 생성 — 참조가 바뀌어야 리렌더 트리거
      set((state) => {
        const next = new Map(state.exerciseHistoryCache);
        next.set(cacheKey, data);
        return { exerciseHistoryCache: next };
      });
      return data;
    } catch (e) {
      logger.warn('운동 히스토리 불러오기 실패', { exerciseName, mode });
      return null;
    }
  },
}));
