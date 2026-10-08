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
import apiClient, { ApiError } from "../lib/apiClient";
import { calcSessionVolume } from "../utils/workout";
import { localDateStr } from "../utils/date";
import { logger } from "../lib/logger";

const WORKOUT_DRAFT_KEY = "workout_draft";

// 300ms 디바운스로 AsyncStorage 쓰기 최소화
// 세트 완료 시마다 즉시 쓰면 불필요한 I/O가 발생하고 애니메이션이 끊길 수 있다
let _draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 임시저장의 두 가지 뜻. **키를 나눠 둔다.**
 *
 *   'active'       (`workout_draft`) 아직 하는 중인 운동. 앱이 죽어도 이어서
 *                  하라고 되살린다. 24시간이 지나면 버린다 — 사용자가 이미
 *                  잊은 것으로 본다.
 *   'pending_save' (`workout_pending_save:v1`) 사용자가 완료를 눌렀는데
 *                  **서버 저장이 실패한** 운동. 이미 끝난 운동이라 이어할 것이
 *                  없고, 되살릴 것은 "저장"뿐이다.
 *                  ★ **만료가 없다.** 여기에 24시간을 적용하면 손실을 하루
 *                    미루는 것일 뿐이라 안전판이 되지 못한다.
 *
 * ★ **한 키에 status 필드만 두는 방식은 쓸 수 없다.** 저장에 실패한 운동을
 *   남겨 둔 채 사용자가 다음 운동을 시작하면, 진행 중 세션의 임시저장이 같은
 *   키를 덮어써서 구조되지 못한 기록이 그 자리에서 사라진다. 하루 이틀 뒤
 *   다시 운동하는 것은 드문 일이 아니므로 현실적인 경로다.
 *
 * 상태를 구분하는 이유: 구분이 없으면 저장 실패한 운동이 "이어할까요?"로
 * 떠서 타이머가 다시 돌고, 사용자가 '새로 시작'을 고르면 영구 손실이 된다.
 */
type DraftStatus = "active" | "pending_save";

/**
 * 저장 대기 운동의 임시저장 키.
 * ★ 새 키이므로 `lib/accountCache.ts` 의 ACCOUNT_CACHE_KEYS 에 등록했다 —
 *   등록하지 않으면 로그아웃 후 다른 계정에서 이전 사용자의 운동이 되살아난다.
 */
const PENDING_SAVE_KEY = "workout_pending_save:v1";

/** 저장 실패 시 **얼려 두는** 값. 재시도는 이 값을 그대로 다시 보낸다. */
export interface PendingSave {
  session: WorkoutSession;
  /** 완료를 누른 시점에 계산된 소요 시간. 재시도가 늦어져도 늘어나지 않는다. */
  durationMinutes: number;
  /** 같은 시점에 계산된 소모 칼로리. */
  caloriesBurned: number;
  failedAt: number;
}

interface WorkoutDraft {
  session: WorkoutSession;
  sessionStartTime: number | null;
  workoutElapsed: number;
  savedAt: number;
  /** 구버전 draft에는 없다 — 없으면 'active'로 읽는다. */
  status?: DraftStatus;
  /** status가 'pending_save'일 때만 있다. */
  pending?: { durationMinutes: number; caloriesBurned: number; failedAt: number };
}

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
    const draft: WorkoutDraft = {
      session, sessionStartTime, workoutElapsed, savedAt: Date.now(), status: "active",
    };
    AsyncStorage.setItem(WORKOUT_DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, 300);
};

/**
 * 저장 실패한 운동을 **즉시** 디스크에 쓴다.
 *
 * ★ 디바운스를 쓰지 않는다. 이 쓰기가 손실을 막는 마지막 장치인데, 300ms를
 *   기다리는 사이에 앱이 죽으면 그 운동은 어디에도 남지 않는다. 진행 중
 *   세션의 디바운스는 세트마다 쓰는 것을 줄이려는 최적화이고, 이쪽은 운동당
 *   한 번뿐이라 줄일 이유도 없다.
 */
const savePendingDraft = async (p: PendingSave): Promise<void> => {
  const draft: WorkoutDraft = {
    session: p.session,
    sessionStartTime: null,
    workoutElapsed: 0,
    savedAt: p.failedAt,
    status: "pending_save",
    pending: {
      durationMinutes: p.durationMinutes,
      caloriesBurned: p.caloriesBurned,
      failedAt: p.failedAt,
    },
  };
  try {
    await AsyncStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(draft));
  } catch (e) {
    // 여기까지 실패하면 메모리의 pendingSave 가 유일한 사본이다. 앱을 끄면 잃는다.
    logger.error("저장 대기 운동의 임시저장 실패", e instanceof Error ? e : new Error(String(e)));
  }
};

/** 저장 대기 임시저장을 지운다. 저장에 성공했거나 사용자가 버렸을 때만 부른다. */
const clearPendingDraft = () => {
  AsyncStorage.removeItem(PENDING_SAVE_KEY).catch(() => {});
};

/**
 * 서버로 보낼 운동 세션 본문. **최초 저장과 재시도가 같은 함수를 쓴다** —
 * 두 곳에서 각자 만들면 재시도가 조금씩 다른 것을 보내게 된다.
 */
const buildWorkoutPayload = (
  session: WorkoutSession,
  durationMinutes: number,
  caloriesBurned: number,
) => ({
  date: session.date,
  durationMinutes,
  caloriesBurned,
  note: session.note,
  fromRoutineId: session.fromRoutineId ?? null,
  exercises: session.exercises
    // 완료 세트 없는 종목은 히스토리에 남지 않게 저장 단계에서 제외 (요청 이력)
    .filter((ex) => ex.sets.some((s) => s.completed))
    .map((ex, idx) => ({
      name: ex.name,
      category: ex.category,
      settings: ex.settings ?? [],
      tip: ex.tip ?? "",
      isSingleArm: ex.isSingleArm ?? false,
      targetMuscles: ex.targetMuscles ?? [],
      restSeconds: ex.restSeconds ?? null,
      targetReps: ex.targetReps ?? "",
      order: idx,
      // 완료된 세트만 저장
      sets: ex.sets
        .filter((st) => st.completed)
        .map((st) => ({
          weight: st.weight,
          reps: st.reps,
          completed: true,
          unit: st.unit ?? "kg",
        })),
    })),
});

export type CompareMode = "recent" | "pr" | "week" | "month";

export interface ExerciseHistoryEntry {
  date: string;
  maxWeight: number;
  maxVolume: number;
  totalSets: number;
  sets: { weight: number; reps: number; unit?: string }[];
  // 종목 상세 — 다음 추가 시 폼 기본값 복원용 (구버전 서버 응답 호환 위해 optional)
  isSingleArm?: boolean;
  settings?: { key: string; value: string }[];
  tip?: string;
  restSeconds?: number | null;
  targetReps?: string;
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
  /** 로그아웃·탈퇴 시 호출. lib/accountCache.ts 참조. */
  reset: () => void;
  activeSession: WorkoutSession | null;
  sessionStartTime: number | null;
  isLoading: boolean;
  /** 운동 기록 로드 실패 메시지 (null=정상). 크래시 대신 재시도 UI를 띄우기 위한 상태. */
  loadError: string | null;
  /** 기록 캘린더에서 날짜 탭 시 히스토리 탭으로 점프할 날짜 (YYYY-MM-DD). 소비 후 null. */
  historyJumpDate: string | null;
  setHistoryJumpDate: (date: string | null) => void;
  exerciseHistoryCache: Map<string, ExerciseHistory>;
  workoutElapsed: number;
  workoutPaused: boolean;
  /**
   * 완료를 눌렀지만 서버 저장이 실패해 **아직 어디에도 기록되지 않은** 운동.
   *
   * `activeSession` 과 별개의 필드인 이유: 이 운동은 이미 끝났다. 같은 필드에
   * 두면 전역 미니 바(`ActiveWorkoutBar`)가 "운동 진행 중"으로 시계를 돌리고,
   * 복원 시에는 "이어할까요?" 가 떠서 '새로 시작'이 곧 영구 손실이 된다.
   * 끝난 것과 하는 중인 것을 상태로 구분해 두 화면이 각자 맞게 말하게 한다.
   */
  pendingSave: PendingSave | null;

  startSession: () => void;
  startSessionWithRoutine: (routine: Routine) => void;
  /**
   * 완료 세트가 있는 종목만 저장.
   *   'empty'  저장할 게 없음 — 저장/정리 안 함
   *   'saved'  서버 저장 성공 — 세션과 임시저장 정리됨
   *   'failed' 서버 저장 실패 — ★ **세션을 `pendingSave` 로 옮겨 보관한다.**
   *            임시저장도 지우지 않는다. 호출부는 완료 화면을 띄우지 말고
   *            실패를 알린 뒤 `retryPendingSave()` 를 안내해야 한다.
   */
  endSession: (caloriesBurned: number) => Promise<'empty' | 'saved' | 'failed'>;
  /** 저장 대기 중인 운동을 다시 보낸다. 얼려 둔 시간·칼로리를 그대로 쓴다. */
  retryPendingSave: () => Promise<'saved' | 'failed' | 'empty'>;
  /** 저장 대기 중인 운동을 **버린다.** 파괴적이라 호출부가 반드시 확인을 받는다. */
  discardPendingSave: () => void;
  deleteSession: (id: string) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, "sets">) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateExercise: (exerciseId: string, data: Partial<Omit<Exercise, 'id' | 'sets'>>) => void;
  removeExercise: (exerciseId: string) => void;
  updateSession: (sessionId: string, exercises: WorkoutSession['exercises']) => Promise<void>;
  updateSessionDate: (sessionId: string, date: string) => Promise<void>;
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

const todayStr = () => localDateStr();

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
  loadError: null,
  historyJumpDate: null,
  setHistoryJumpDate: (date) => set({ historyJumpDate: date }),
  exerciseHistoryCache: new Map(),
  workoutElapsed: 0,
  workoutPaused: false,
  pendingSave: null,

  /**
   * 세션을 저장하지 않고 종료. 운동 도중 "그냥 나가기" 시 사용
   *
   * `pendingSave` 는 건드리지 않는다. 저장 대기 중인 **다른** 운동이 있다면
   * 그것은 이 운동과 무관하게 아직 구조되지 못한 기록이다.
   */
  cancelSession: () => {
    get().stopWorkoutTimer();
    set({ activeSession: null, sessionStartTime: null, workoutElapsed: 0, workoutPaused: false });
    saveWorkoutDraft(null, null, 0);
  },

  /**
   * 앱 시작 시 임시저장을 복원한다. **두 종류를 모두 본다.**
   *
   * 1) 저장 대기(`workout_pending_save:v1`) — 끝났지만 서버에 못 보낸 운동.
   *    ★ **만료를 적용하지 않는다.** 사용자가 구조할 때까지 남는다.
   * 2) 진행 중(`workout_draft`) — 하던 운동. 24시간이 지나면 버린다.
   *    너무 오래된 것은 사용자가 이미 잊었거나 의도적으로 종료한 것으로 본다.
   *
   * 반환값은 **"이어서 할지 물어볼 진행 중 세션이 복원되었는가"** 다.
   * 저장 대기 건은 이어할 운동이 아니라 보낼 기록이므로 `false` 다 —
   * 호출부의 "이어하기 / 새로 시작" 질문에 걸리면 '새로 시작'이 그 자리에서
   * 영구 손실이 된다. 저장 대기는 운동 탭의 배너가 따로 안내한다.
   */
  restoreDraft: async () => {
    // ── 1. 저장 대기 ──
    try {
      const rawPending = await AsyncStorage.getItem(PENDING_SAVE_KEY);
      if (rawPending) {
        const d: WorkoutDraft = JSON.parse(rawPending);
        if (d?.session && d.pending) {
          set({
            pendingSave: {
              session: d.session,
              durationMinutes: d.pending.durationMinutes,
              caloriesBurned: d.pending.caloriesBurned,
              failedAt: d.pending.failedAt ?? d.savedAt,
            },
          });
          logger.warn('저장 대기 중인 운동을 복원했다', { failedAt: d.pending.failedAt });
        } else {
          // 형태가 깨진 값은 되살릴 수 없다. 남겨 두면 매번 같은 실패를 반복한다.
          await AsyncStorage.removeItem(PENDING_SAVE_KEY);
        }
      }
    } catch {
      // 저장 대기 복원 실패가 진행 중 세션 복원을 막지 않게 한다.
    }

    // ── 2. 진행 중 ──
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
    if (!active) return 'empty';

    // 완료 세트 없는 종목은 히스토리에 남지 않게 저장 단계에서 제외 (요청 이력)
    // 완료 세트가 1개 이상인 종목만 저장 (빈 종목 제외)
    const exercisesToSave = active.exercises.filter((ex) =>
      ex.sets.some((s) => s.completed)
    );
    // 저장할 운동이 없으면 저장/정리하지 않고 호출부에 알림 (안내 후 cancelSession)
    if (exercisesToSave.length === 0) return 'empty';

    const durationMinutes = startTime
      ? Math.max(Math.round((Date.now() - startTime) / 60000), 1)
      : 0;

    logger.info('운동 세션 종료', {
      exercises: exercisesToSave.length,
      durationMinutes,
      caloriesBurned,
    });

    get().stopWorkoutTimer();
    set({ workoutElapsed: 0, workoutPaused: false });

    try {
      await apiClient.post("/workout", buildWorkoutPayload(active, durationMinutes, caloriesBurned));
    } catch (e) {
      logger.error('운동 저장 실패', e instanceof Error ? e : new Error(String(e)));

      // ── 손실 방지 ────────────────────────────────────────────────────────
      // 전에는 아래 정리 세 줄이 try/catch 바깥에 있어 실패해도 그대로 돌았다.
      // 세션을 비우고(1) 임시저장을 지우고(2) 'saved'를 반환해(3) 호출부가
      // 완료 화면까지 띄웠다 — 사라진 기록을 축하하는 상태였다.
      //
      // 이제 실패하면 **아무것도 지우지 않고** 세션을 pendingSave 로 옮긴다.
      // 소요 시간과 칼로리를 여기서 얼려 두는 이유: 재시도가 한참 뒤에 일어나도
      // 기록된 운동 시간이 그만큼 늘어나면 안 된다. 타이머를 되돌리는 대신
      // 값을 고정하는 쪽이 확실하다 — 되돌리면 재시도까지의 시간이 섞인다.
      // ★ 알려진 한계 — 저장 대기 자리는 **하나**다.
      //   이미 대기 중인 운동이 있는데 또 실패하면 앞의 것이 덮인다. 큐로
      //   바꾸는 것은 2단계 과제라, 지금은 덮이는 순간을 Sentry 로 남겨
      //   실제로 일어나는지 알 수 있게만 해 둔다. (배너가 운동 탭 첫 화면에
      //   떠 있으므로 다음 운동을 시작하기 전에 보일 가능성이 높다.)
      const prev = get().pendingSave;
      if (prev) {
        logger.error(
          '저장 대기 운동이 덮였다 — 앞선 기록이 사라진다',
          new Error(`previous failedAt=${prev.failedAt}, date=${prev.session.date}`),
        );
      }

      const pending: PendingSave = {
        session: active,
        durationMinutes,
        caloriesBurned,
        failedAt: Date.now(),
      };
      // 디스크에 먼저 쓴다. 쓰기가 끝난 뒤에야 메모리의 activeSession 을 비운다.
      await savePendingDraft(pending);
      set({ activeSession: null, sessionStartTime: null, pendingSave: pending });
      // 진행 중 임시저장은 이제 pendingSave 가 들고 있으므로 비운다.
      saveWorkoutDraft(null, null, 0);
      return 'failed';
    }

    // fetchSessions 는 성공 경로에서만 부른다. 내부에서 예외를 삼키므로
    // 여기 실패가 저장 실패로 오인되지 않는다(이미 서버에는 저장됐다).
    await get().fetchSessions();
    set({ activeSession: null, sessionStartTime: null });
    saveWorkoutDraft(null, null, 0);
    return 'saved';
  },

  /**
   * 저장 대기 중인 운동을 다시 보낸다.
   *
   * 얼려 둔 `durationMinutes`·`caloriesBurned` 를 그대로 쓴다. 성공하면 그때야
   * 임시저장을 지운다 — 응답을 받기 전에 지우면 그 사이 앱이 죽었을 때
   * 처음과 같은 손실이 난다.
   *
   * ★ 1단계에는 자동 재시도가 없다. **사용자가 눌러야만** 요청이 나간다.
   *   서버에 멱등키가 없어서(2단계 과제) 자동 재시도는 "서버에는 저장됐는데
   *   응답을 못 받은" 경우에 중복 기록을 만든다. 사람이 결과를 보고 누르는
   *   동안에는 그 중복이 눈에 보이고 되돌릴 수 있다.
   */
  retryPendingSave: async () => {
    const p = get().pendingSave;
    if (!p) return 'empty';
    try {
      await apiClient.post(
        "/workout",
        buildWorkoutPayload(p.session, p.durationMinutes, p.caloriesBurned),
      );
    } catch (e) {
      logger.error('운동 저장 재시도 실패', e instanceof Error ? e : new Error(String(e)));
      return 'failed';
    }
    logger.info('운동 저장 재시도 성공', { failedAt: p.failedAt });
    clearPendingDraft();
    set({ pendingSave: null });
    await get().fetchSessions();
    return 'saved';
  },

  /** 저장 대기 중인 운동을 버린다. 되돌릴 수 없어 호출부가 확인을 받는다. */
  discardPendingSave: () => {
    clearPendingDraft();
    set({ pendingSave: null });
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

  /**
   * 히스토리 세션의 날짜를 변경한다 (Optimistic Update).
   * 로컬 date를 즉시 바꾸고 date DESC로 재정렬 → 서버 PATCH → 실패 시 롤백.
   */
  updateSessionDate: async (sessionId, date) => {
    const prev = get().sessions;
    set((s) => ({
      sessions: s.sessions
        .map((sess) => (sess.id === sessionId ? { ...sess, date } : sess))
        .sort((a, b) => b.date.localeCompare(a.date)),
    }));
    try {
      await apiClient.patch(`/workout/${sessionId}`, { date });
    } catch (e) {
      set({ sessions: prev });
      logger.error('운동 날짜 변경 실패', e instanceof Error ? e : new Error(String(e)));
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
    set({ isLoading: true, loadError: null });
    try {
      const res = await apiClient.get("/workout");
      // 방어: 정상 응답이라도 배열이 아니면(서버 계약 위반/프록시 에러 페이지 등)
      // .map에서 크래시하므로 배열이 아닐 땐 빈 배열로 취급한다.
      const raw = Array.isArray(res.data) ? (res.data as WorkoutSession[]) : [];
      // order 필드 기준으로 운동 종목 정렬 — 서버가 이미 정렬해 주지 않는 경우 대비.
      // exercises가 없는 구버전/부분 레코드도 있을 수 있어 ?? []로 방어.
      const sessions = raw.map(s => ({
        ...s,
        exercises: [...(s.exercises ?? [])].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
      }));
      set({ sessions, isLoading: false, loadError: null });
    } catch (e) {
      logger.error('운동 기록 불러오기 실패', e instanceof Error ? e : new Error(String(e)));
      // throw 하지 않는다 — 호출부(화면)에서 잡히지 않으면 크래시하므로,
      // 대신 loadError를 세팅해 화면이 "다시 시도" UI를 그리게 한다.
      // 404 "Application not found"(Railway 인프라 이슈)는 별도 안내 문구로 구분.
      const is404 = e instanceof ApiError && e.status === 404;
      set({
        isLoading: false,
        loadError: is404
          ? '서비스가 일시적으로 사용 불가해요. 잠시 후 다시 시도해주세요.'
          : '기록을 불러올 수 없어요. 네트워크를 확인해주세요.',
      });
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

  /** 로그아웃·탈퇴 시 메모리 상태를 비운다. lib/accountCache.ts 참조. */
  // pendingSave 도 비운다. 저장소 쪽은 clearAccountCache 가 PENDING_SAVE_KEY 를
  // 함께 지운다 — 메모리만 비우면 다음 로그인에서 남의 운동이 되살아난다.
  reset: () => set({
    sessions: [], activeSession: null, sessionStartTime: null,
    isLoading: false, loadError: null, historyJumpDate: null,
    exerciseHistoryCache: new Map(), workoutElapsed: 0, workoutPaused: false,
    pendingSave: null,
  }),
}));
