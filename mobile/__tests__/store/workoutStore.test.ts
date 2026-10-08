import { act, renderHook } from '@testing-library/react-native';
import { useWorkoutStore, calculateCaloriesBurned } from '../../store/workoutStore';
import type { WorkoutSession } from '../../types/workout';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/apiClient', () => {
  // ApiError 를 함께 모킹한다. fetchSessions 의 catch 가 `e instanceof ApiError` 로
  // 404 를 구분하는데, 이게 undefined 면 instanceof 자체가 TypeError 로 터진다.
  // (이 모킹이 비어 있던 동안 fetchSessions 의 실패 경로는 한 번도 테스트되지 않았다.)
  // 파라미터 프로퍼티(`public status: number`)를 쓰지 않는다 — 트랜스파일 결과가
  // jest 의 "모듈 팩토리는 스코프 밖 변수를 참조할 수 없다" 검사에 걸린다.
  class ApiError extends Error {
    status: number;
    url: string;
    constructor(status: number, message: string, url: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.url = url;
    }
  }
  return {
    __esModule: true,
    ApiError,
    default: {
      get: jest.fn().mockResolvedValue({ data: [] }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      patch: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({ data: {} }),
    },
    setUnauthorizedHandler: jest.fn(),
  };
});

const INITIAL_STATE = {
  activeSession: null,
  sessions: [],
  isLoading: false,
  sessionStartTime: null,
  workoutElapsed: 0,
  workoutPaused: false,
  exerciseHistoryCache: new Map(),
  pendingSave: null,
};

const BASE_EXERCISE = {
  id: 'ex-1',
  name: '벤치프레스',
  category: '가슴',
  settings: [] as any[],
  tip: '',
  isSingleArm: false,
} as const;

const BASE_SET = {
  id: 'set-1',
  weight: 100,
  reps: 10,
  completed: false,
  unit: 'kg' as const,
};

describe('workoutStore', () => {
  beforeEach(() => {
    useWorkoutStore.setState(INITIAL_STATE);
    jest.useFakeTimers();
  });

  afterEach(() => {
    useWorkoutStore.getState().stopWorkoutTimer();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ─── startSession ───────────────────────────────────────────────────────────

  describe('startSession', () => {
    it('새 세션 생성 및 exercises 빈 배열 초기화', () => {
      const { result } = renderHook(() => useWorkoutStore());
      act(() => { result.current.startSession(); });

      expect(result.current.activeSession).not.toBeNull();
      expect(result.current.activeSession?.exercises).toHaveLength(0);
    });

    it('세션 시작 시간 기록', () => {
      const { result } = renderHook(() => useWorkoutStore());
      const before = Date.now();
      act(() => { result.current.startSession(); });

      expect(result.current.sessionStartTime).toBeGreaterThanOrEqual(before);
    });

    it('이미 세션이 있어도 새 세션 생성 시 exercises 초기화', () => {
      const { result } = renderHook(() => useWorkoutStore());
      act(() => {
        result.current.startSession();
        // 운동 추가 후 두 번째 startSession으로 덮어쓰기
        result.current.startSession();
      });
      // 새 세션은 exercises가 빈 배열
      expect(result.current.activeSession?.exercises).toHaveLength(0);
    });
  });

  // ─── addExercise ────────────────────────────────────────────────────────────

  describe('addExercise', () => {
    it('세션에 운동 추가', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
      });

      expect(result.current.activeSession?.exercises).toHaveLength(1);
      expect(result.current.activeSession?.exercises[0].name).toBe('벤치프레스');
    });

    it('추가된 운동의 sets는 빈 배열', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
      });

      expect(result.current.activeSession?.exercises[0].sets).toHaveLength(0);
    });

    it('여러 운동 순서대로 추가', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise({ ...BASE_EXERCISE, id: 'ex-1', name: '벤치프레스' });
        result.current.addExercise({ ...BASE_EXERCISE, id: 'ex-2', name: '스쿼트' });
      });

      const exercises = result.current.activeSession?.exercises;
      expect(exercises).toHaveLength(2);
      expect(exercises?.[0].name).toBe('벤치프레스');
      expect(exercises?.[1].name).toBe('스쿼트');
    });

    it('세션 없으면 아무것도 추가 안 함', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.addExercise(BASE_EXERCISE); // activeSession이 null
      });

      expect(result.current.activeSession).toBeNull();
    });
  });

  // ─── addSet ─────────────────────────────────────────────────────────────────

  describe('addSet', () => {
    it('운동에 세트 추가', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', BASE_SET);
      });

      const sets = result.current.activeSession?.exercises[0].sets;
      expect(sets).toHaveLength(1);
      expect(sets?.[0].weight).toBe(100);
      expect(sets?.[0].reps).toBe(10);
      expect(sets?.[0].unit).toBe('kg');
    });

    it('여러 세트 순서대로 추가', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', weight: 80 });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-2', weight: 100 });
      });

      const sets = result.current.activeSession?.exercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets?.[0].weight).toBe(80);
      expect(sets?.[1].weight).toBe(100);
    });

    it('lbs 단위 세트 추가', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, weight: 225, unit: 'lbs' });
      });

      const set = result.current.activeSession?.exercises[0].sets[0];
      expect(set?.unit).toBe('lbs');
      expect(set?.weight).toBe(225);
    });
  });

  // ─── updateSet ──────────────────────────────────────────────────────────────

  describe('updateSet', () => {
    it('무게 수정 시 다른 필드 유지', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', BASE_SET);
        result.current.updateSet('ex-1', 'set-1', { weight: 120 });
      });

      const set = result.current.activeSession?.exercises[0].sets[0];
      expect(set?.weight).toBe(120);
      expect(set?.reps).toBe(10);      // 변경 안 됨
      expect(set?.unit).toBe('kg');    // 변경 안 됨
      expect(set?.completed).toBe(false); // 변경 안 됨
    });

    it('completed 상태 true로 변경', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', BASE_SET);
        result.current.updateSet('ex-1', 'set-1', { completed: true });
      });

      expect(result.current.activeSession?.exercises[0].sets[0].completed).toBe(true);
    });

    it('단위 kg → lbs 변경', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', BASE_SET);
        result.current.updateSet('ex-1', 'set-1', { unit: 'lbs' });
      });

      expect(result.current.activeSession?.exercises[0].sets[0].unit).toBe('lbs');
    });

    it('존재하지 않는 세트 id는 무시', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', BASE_SET);
        result.current.updateSet('ex-1', 'nonexistent', { weight: 999 });
      });

      // 기존 세트 그대로
      expect(result.current.activeSession?.exercises[0].sets[0].weight).toBe(100);
    });

    // 회귀 방지: "세트별 개별 설정" OFF로 추가하면 모든 세트가 같은 초기값으로 생성되지만,
    // 각 세트는 독립적이어야 한다. 운동 중 세트마다 다르게 수정해도 서로 묶이거나
    // 1세트 값으로 덮어써지면 안 된다.
    it('동일 초기값으로 만든 여러 세트를 각각 다르게 수정해도 독립 유지', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        // 개별설정 OFF → 같은 무게/횟수로 3세트 생성 (id만 고유)
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', weight: 100, reps: 10 });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-2', weight: 100, reps: 10 });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-3', weight: 100, reps: 10 });
        // 운동 중 세트마다 다르게 수정
        result.current.updateSet('ex-1', 'set-2', { weight: 110, reps: 8 });
        result.current.updateSet('ex-1', 'set-3', { weight: 120, reps: 6 });
      });

      const sets = result.current.activeSession?.exercises[0].sets;
      expect(sets?.map((s) => [s.weight, s.reps])).toEqual([
        [100, 10],
        [110, 8],
        [120, 6],
      ]);
    });
  });

  // ─── removeSet ──────────────────────────────────────────────────────────────

  describe('removeSet', () => {
    it('지정한 세트 삭제', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1' });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-2', weight: 90 });
        result.current.removeSet('ex-1', 'set-1');
      });

      const sets = result.current.activeSession?.exercises[0].sets;
      expect(sets).toHaveLength(1);
      expect(sets?.[0].id).toBe('set-2');
    });

    it('마지막 세트 삭제 후 빈 배열', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', BASE_SET);
        result.current.removeSet('ex-1', 'set-1');
      });

      expect(result.current.activeSession?.exercises[0].sets).toHaveLength(0);
    });
  });

  // ─── removeExercise ─────────────────────────────────────────────────────────

  describe('removeExercise', () => {
    it('운동 삭제', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise({ ...BASE_EXERCISE, id: 'ex-1', name: '벤치프레스' });
        result.current.addExercise({ ...BASE_EXERCISE, id: 'ex-2', name: '스쿼트' });
        result.current.removeExercise('ex-1');
      });

      const exercises = result.current.activeSession?.exercises;
      expect(exercises).toHaveLength(1);
      expect(exercises?.[0].name).toBe('스쿼트');
    });
  });

  // ─── cancelSession ──────────────────────────────────────────────────────────

  describe('cancelSession', () => {
    it('activeSession과 sessionStartTime null로 초기화', () => {
      const { result } = renderHook(() => useWorkoutStore());
      act(() => {
        result.current.startSession();
        result.current.cancelSession();
      });

      expect(result.current.activeSession).toBeNull();
      expect(result.current.sessionStartTime).toBeNull();
    });

    it('세션 없을 때 호출해도 에러 없음', () => {
      const { result } = renderHook(() => useWorkoutStore());
      expect(() => {
        act(() => { result.current.cancelSession(); });
      }).not.toThrow();
    });
  });

  // ─── getTotalVolume ──────────────────────────────────────────────────────────

  describe('getTotalVolume', () => {
    const makeSession = (sets: WorkoutSession['exercises'][0]['sets']): WorkoutSession => ({
      id: 's-1',
      date: '2026-06-10',
      durationMinutes: 60,
      note: '',
      exercises: [{
        id: 'ex-1',
        name: '벤치프레스',
        category: '가슴',
        sets,
        settings: [],
        tip: '',
        isSingleArm: false,
      }],
    });

    it('완료된 세트만 볼륨 계산 (100kg × 10회 = 1000)', () => {
      const { result } = renderHook(() => useWorkoutStore());
      const session = makeSession([
        { id: 's1', weight: 100, reps: 10, completed: true, unit: 'kg' },
        { id: 's2', weight: 100, reps: 10, completed: false, unit: 'kg' },
      ]);
      expect(result.current.getTotalVolume(session)).toBe(1000);
    });

    it('모든 세트 미완료이면 0', () => {
      const { result } = renderHook(() => useWorkoutStore());
      const session = makeSession([
        { id: 's1', weight: 100, reps: 10, completed: false, unit: 'kg' },
      ]);
      expect(result.current.getTotalVolume(session)).toBe(0);
    });

    it('운동 없으면 0', () => {
      const { result } = renderHook(() => useWorkoutStore());
      const session: WorkoutSession = {
        id: 's-1', date: '2026-06-10', durationMinutes: 0, note: '', exercises: [],
      };
      expect(result.current.getTotalVolume(session)).toBe(0);
    });
  });

  // ─── endSession 저장 payload ────────────────────────────────────────────────
  // 회귀 방지: 저장은 "세트별 개별 설정" 토글과 무관하게 항상 각 세트의 실제 현재 값을
  // 보내야 한다. 세트가 1세트 값/초기값으로 묶여 덮어써지면 안 된다.
  describe('endSession', () => {
    it('수정된 세트별 실제 값을 그대로 POST', async () => {
      const apiClient = require('../../lib/apiClient').default;
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        // 개별설정 OFF → 동일 초기값 3세트 (모두 완료 처리)
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', weight: 100, reps: 10, completed: true });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-2', weight: 100, reps: 10, completed: true });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-3', weight: 100, reps: 10, completed: true });
        // 운동 중 세트마다 다르게 수정
        result.current.updateSet('ex-1', 'set-2', { weight: 110, reps: 8 });
        result.current.updateSet('ex-1', 'set-3', { weight: 120, reps: 6 });
        await result.current.endSession(0);
      });

      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      expect(postCall).toBeDefined();
      const savedSets = postCall[1].exercises[0].sets;
      expect(savedSets.map((s: any) => [s.weight, s.reps])).toEqual([
        [100, 10],
        [110, 8],
        [120, 6],
      ]);
    });

    it('완료 세트만 저장 (미완료 세트는 제외)', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockClear();
      const { result } = renderHook(() => useWorkoutStore());
      let ret: 'empty' | 'saved' | 'failed' | undefined;
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', weight: 100, reps: 10, completed: true });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-2', weight: 100, reps: 10, completed: false });
        ret = await result.current.endSession(0);
      });
      expect(ret).toBe('saved');
      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      const savedSets = postCall[1].exercises[0].sets;
      expect(savedSets).toHaveLength(1);
      expect(savedSets[0].completed).toBe(true);
    });

    it("완료 세트가 하나도 없으면 'empty' 반환 + POST 안 함", async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockClear();
      const { result } = renderHook(() => useWorkoutStore());
      let ret: 'empty' | 'saved' | 'failed' | undefined;
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', weight: 100, reps: 10, completed: false });
        ret = await result.current.endSession(0);
      });
      expect(ret).toBe('empty');
      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      expect(postCall).toBeUndefined();
    });
  });

  // ─── 저장 실패 시 손실 방지 ────────────────────────────────────────────────
  //
  // 고치기 전에는 endSession 이 실패해도 activeSession 을 비우고 임시저장을
  // 지운 뒤 'saved' 를 반환했다. 그 운동은 어디에도 남지 않았다.
  // 아래 테스트들이 지키는 것은 "실패했을 때 지우지 않는다" 하나다.
  describe('endSession — 저장 실패', () => {
    const PENDING_KEY = 'workout_pending_save:v1';
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    /** 완료 세트 하나짜리 세션을 만들고 종료까지 시도한다. */
    const runFailingEnd = async (result: any, calories = 123) => {
      let ret: 'empty' | 'saved' | 'failed' | undefined;
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', completed: true });
        ret = await result.current.endSession(calories);
      });
      return ret;
    };

    beforeEach(() => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('network down'));
    });

    afterEach(() => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
    });

    it("'failed' 를 반환한다 (전에는 'saved' 였다)", async () => {
      const { result } = renderHook(() => useWorkoutStore());
      expect(await runFailingEnd(result)).toBe('failed');
    });

    it('세션을 pendingSave 로 보존한다 — 완료 세트와 종목이 그대로 남는다', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await runFailingEnd(result);

      const pending = useWorkoutStore.getState().pendingSave;
      expect(pending).not.toBeNull();
      expect(pending!.session.exercises[0].name).toBe('벤치프레스');
      expect(pending!.session.exercises[0].sets[0].completed).toBe(true);
      // 완료 시점에 계산된 칼로리가 얼려진다.
      expect(pending!.caloriesBurned).toBe(123);
      // 진행 중 세션은 비워진다 — 운동은 끝났고 남은 일은 저장뿐이다.
      expect(useWorkoutStore.getState().activeSession).toBeNull();
    });

    it('저장 대기 임시저장을 디스크에 쓴다', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await runFailingEnd(result);

      const write = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        ([key]: [string]) => key === PENDING_KEY,
      );
      expect(write).toBeDefined();
      const saved = JSON.parse(write[1]);
      expect(saved.status).toBe('pending_save');
      expect(saved.pending.caloriesBurned).toBe(123);
      expect(saved.session.exercises[0].sets[0].completed).toBe(true);
    });

    it('★ 저장 대기 임시저장을 지우지 않는다 — 이것이 손실을 막는 장치다', async () => {
      const { result } = renderHook(() => useWorkoutStore());
      await runFailingEnd(result);

      const removedPending = (AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === PENDING_KEY,
      );
      expect(removedPending).toBe(false);
    });

    // ★ 이 파일에서 가장 중요한 테스트다. 실패 처리를 넣다가 정상 저장이
    //   깨지면 고치기 전보다 나쁘다. 성공 경로의 네 가지를 한꺼번에 고정한다.
    it("★ 성공 경로 회귀 — 'saved' + 세션 비움 + 임시저장 삭제 + 대기 없음", async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      (AsyncStorage.removeItem as jest.Mock).mockClear();
      (AsyncStorage.setItem as jest.Mock).mockClear();
      const { result } = renderHook(() => useWorkoutStore());

      let ret: 'empty' | 'saved' | 'failed' | undefined;
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', completed: true });
        ret = await result.current.endSession(0);
      });

      // 1) 반환값
      expect(ret).toBe('saved');
      // 2) 진행 중 세션이 비워진다
      expect(useWorkoutStore.getState().activeSession).toBeNull();
      expect(useWorkoutStore.getState().sessionStartTime).toBeNull();
      // 3) 진행 중 임시저장이 지워진다
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === 'workout_draft',
      )).toBe(true);
      // 4) 저장 대기가 생기지 않는다 — 메모리와 디스크 양쪽
      expect(useWorkoutStore.getState().pendingSave).toBeNull();
      expect((AsyncStorage.setItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === PENDING_KEY,
      )).toBe(false);
      // 5) 서버로 실제 세트가 나갔다
      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      expect(postCall[1].exercises[0].sets).toHaveLength(1);
    });
  });

  // ─── 재시도 ────────────────────────────────────────────────────────────────
  describe('retryPendingSave', () => {
    const PENDING_KEY = 'workout_pending_save:v1';
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    const PENDING = {
      session: {
        id: 'w-1',
        date: '2026-06-10',
        durationMinutes: 0,
        note: '',
        exercises: [{
          ...BASE_EXERCISE,
          sets: [{ ...BASE_SET, id: 'set-1', completed: true }],
        }],
      } as unknown as WorkoutSession,
      durationMinutes: 42,
      caloriesBurned: 321,
      failedAt: 1_700_000_000_000,
    };

    it('대기 중인 것이 없으면 요청하지 않는다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockClear();
      const { result } = renderHook(() => useWorkoutStore());

      let ret: string | undefined;
      await act(async () => { ret = await result.current.retryPendingSave(); });

      expect(ret).toBe('empty');
      expect(apiClient.post as jest.Mock).not.toHaveBeenCalled();
    });

    it('얼려 둔 소요 시간·칼로리를 그대로 다시 보낸다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockClear();
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      useWorkoutStore.setState({ pendingSave: PENDING });
      const { result } = renderHook(() => useWorkoutStore());

      let ret: string | undefined;
      await act(async () => { ret = await result.current.retryPendingSave(); });

      expect(ret).toBe('saved');
      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      // 재시도가 늦어져도 기록되는 운동 시간이 늘어나면 안 된다.
      expect(postCall[1].durationMinutes).toBe(42);
      expect(postCall[1].caloriesBurned).toBe(321);
    });

    it('성공하면 그때야 대기 상태와 임시저장을 지운다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      (AsyncStorage.removeItem as jest.Mock).mockClear();
      useWorkoutStore.setState({ pendingSave: PENDING });
      const { result } = renderHook(() => useWorkoutStore());

      await act(async () => { await result.current.retryPendingSave(); });

      expect(useWorkoutStore.getState().pendingSave).toBeNull();
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === PENDING_KEY,
      )).toBe(true);
    });

    it('★ 또 실패하면 아무것도 지우지 않는다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('still down'));
      (AsyncStorage.removeItem as jest.Mock).mockClear();
      useWorkoutStore.setState({ pendingSave: PENDING });
      const { result } = renderHook(() => useWorkoutStore());

      let ret: string | undefined;
      await act(async () => { ret = await result.current.retryPendingSave(); });

      expect(ret).toBe('failed');
      expect(useWorkoutStore.getState().pendingSave).not.toBeNull();
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === PENDING_KEY,
      )).toBe(false);

      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
    });
  });

  // ─── 복원 분기 ─────────────────────────────────────────────────────────────
  //
  // ★ 실물로 재현하기 가장 어렵고, 깨졌을 때 가장 비싼 곳이다.
  //   저장 대기 건이 "이전 운동을 이어서 할까요?" 알림에 걸리면 사용자가
  //   '새로 시작'을 눌러 그 자리에서 영구 손실이 난다. 호출부
  //   (app/_layout.tsx) 는 restoreDraft() 의 반환값 하나로 그 알림을
  //   띄울지 정하므로, 반환값을 테스트로 고정한다.
  describe('restoreDraft', () => {
    const DRAFT_KEY = 'workout_draft';
    const PENDING_KEY = 'workout_pending_save:v1';
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    const SESSION = {
      id: 'w-1',
      date: '2026-06-10',
      durationMinutes: 0,
      note: '',
      exercises: [{
        ...BASE_EXERCISE,
        sets: [{ ...BASE_SET, id: 'set-1', completed: true }],
      }],
    };

    const HOUR = 60 * 60 * 1000;

    const activeDraft = (savedAt: number) => JSON.stringify({
      session: SESSION, sessionStartTime: savedAt, workoutElapsed: 120,
      savedAt, status: 'active',
    });

    const pendingDraft = (savedAt: number) => JSON.stringify({
      session: SESSION, sessionStartTime: null, workoutElapsed: 0,
      savedAt, status: 'pending_save',
      pending: { durationMinutes: 42, caloriesBurned: 321, failedAt: savedAt },
    });

    /** 키별로 다른 값을 돌려주는 getItem 을 깐다. */
    const seed = (store: Record<string, string | null>) => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(
        async (k: string) => store[k] ?? null,
      );
    };

    afterEach(() => {
      // mockImplementation 은 clearAllMocks 로 지워지지 않는다. 다른 describe 가
      // 전역 기본값(null)을 기대하므로 여기서 되돌린다.
      (AsyncStorage.getItem as jest.Mock).mockReset();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('아무 임시저장도 없으면 false', async () => {
      seed({});
      const { result } = renderHook(() => useWorkoutStore());
      let ret: boolean | undefined;
      await act(async () => { ret = await result.current.restoreDraft(); });
      expect(ret).toBe(false);
      expect(useWorkoutStore.getState().activeSession).toBeNull();
      expect(useWorkoutStore.getState().pendingSave).toBeNull();
    });

    it('진행 중 임시저장만 있으면 true — 이어하기를 물어야 한다', async () => {
      seed({ [DRAFT_KEY]: activeDraft(Date.now()) });
      const { result } = renderHook(() => useWorkoutStore());
      let ret: boolean | undefined;
      await act(async () => { ret = await result.current.restoreDraft(); });

      expect(ret).toBe(true);
      expect(useWorkoutStore.getState().activeSession).not.toBeNull();
      expect(useWorkoutStore.getState().workoutElapsed).toBe(120);
      expect(useWorkoutStore.getState().pendingSave).toBeNull();
    });

    it('★ 저장 대기만 있으면 false — 이어하기 알림이 뜨면 안 된다', async () => {
      seed({ [PENDING_KEY]: pendingDraft(Date.now()) });
      const { result } = renderHook(() => useWorkoutStore());
      let ret: boolean | undefined;
      await act(async () => { ret = await result.current.restoreDraft(); });

      // false 여야 app/_layout.tsx 의 "이어서 할까요? / 새로 시작" 이 안 뜬다.
      expect(ret).toBe(false);
      // 그러면서도 기록은 복원돼 있어야 한다 — 배너가 이 값을 쓴다.
      const pending = useWorkoutStore.getState().pendingSave;
      expect(pending).not.toBeNull();
      expect(pending!.durationMinutes).toBe(42);
      expect(pending!.caloriesBurned).toBe(321);
      // 끝난 운동이므로 진행 중 세션으로 되살아나면 안 된다(타이머가 돈다).
      expect(useWorkoutStore.getState().activeSession).toBeNull();
    });

    it('둘 다 있으면 진행 중은 이어하기(true), 저장 대기는 따로 복원된다', async () => {
      seed({
        [DRAFT_KEY]: activeDraft(Date.now()),
        [PENDING_KEY]: pendingDraft(Date.now()),
      });
      const { result } = renderHook(() => useWorkoutStore());
      let ret: boolean | undefined;
      await act(async () => { ret = await result.current.restoreDraft(); });

      expect(ret).toBe(true);
      expect(useWorkoutStore.getState().activeSession).not.toBeNull();
      expect(useWorkoutStore.getState().pendingSave).not.toBeNull();
    });

    it('형태가 깨진 저장 대기 값은 버린다 — 매번 같은 실패를 반복하지 않게', async () => {
      seed({ [PENDING_KEY]: JSON.stringify({ nonsense: true }) });
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => { await result.current.restoreDraft(); });

      expect(useWorkoutStore.getState().pendingSave).toBeNull();
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === PENDING_KEY,
      )).toBe(true);
    });

    // ── 24시간 만료 ──
    it('진행 중 임시저장은 25시간이 지나면 버린다', async () => {
      seed({ [DRAFT_KEY]: activeDraft(Date.now() - 25 * HOUR) });
      const { result } = renderHook(() => useWorkoutStore());
      let ret: boolean | undefined;
      await act(async () => { ret = await result.current.restoreDraft(); });

      expect(ret).toBe(false);
      expect(useWorkoutStore.getState().activeSession).toBeNull();
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === DRAFT_KEY,
      )).toBe(true);
    });

    it('★ 저장 대기는 25시간이 지나도 살아남는다 — 만료가 없다', async () => {
      seed({ [PENDING_KEY]: pendingDraft(Date.now() - 25 * HOUR) });
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => { await result.current.restoreDraft(); });

      // 여기에 24시간을 적용하면 손실을 하루 미루는 것일 뿐이다.
      expect(useWorkoutStore.getState().pendingSave).not.toBeNull();
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === PENDING_KEY,
      )).toBe(false);
    });

    it('한쪽이 만료돼도 다른 쪽 복원을 막지 않는다', async () => {
      seed({
        [DRAFT_KEY]: activeDraft(Date.now() - 25 * HOUR),   // 만료
        [PENDING_KEY]: pendingDraft(Date.now() - 25 * HOUR), // 유지
      });
      const { result } = renderHook(() => useWorkoutStore());
      let ret: boolean | undefined;
      await act(async () => { ret = await result.current.restoreDraft(); });

      expect(ret).toBe(false);
      expect(useWorkoutStore.getState().activeSession).toBeNull();
      expect(useWorkoutStore.getState().pendingSave).not.toBeNull();
    });
  });

  // ─── 새 운동이 대기 기록을 덮지 않는지 ──────────────────────────────────────
  describe('저장 대기 중 새 운동', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    const PENDING = {
      session: {
        id: 'w-old', date: '2026-06-09', durationMinutes: 0, note: '',
        exercises: [{ ...BASE_EXERCISE, name: '데드리프트',
          sets: [{ ...BASE_SET, id: 'old-1', completed: true }] }],
      } as unknown as WorkoutSession,
      durationMinutes: 42,
      caloriesBurned: 321,
      failedAt: 1_700_000_000_000,
    };

    it('★ 새 운동을 정상 저장해도 대기 기록은 그대로 남는다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      (AsyncStorage.removeItem as jest.Mock).mockClear();
      useWorkoutStore.setState({ pendingSave: PENDING });
      const { result } = renderHook(() => useWorkoutStore());

      let ret: 'empty' | 'saved' | 'failed' | undefined;
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', completed: true });
        ret = await result.current.endSession(0);
      });

      expect(ret).toBe('saved');
      // 새 운동의 성공이 앞선 실패 기록을 지우면 안 된다. 둘은 무관하다.
      const pending = useWorkoutStore.getState().pendingSave;
      expect(pending).not.toBeNull();
      expect(pending!.session.exercises[0].name).toBe('데드리프트');
      expect(pending!.durationMinutes).toBe(42);
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === 'workout_pending_save:v1',
      )).toBe(false);
    });
  });

  // ─── loadError 와 pendingSave 는 서로 독립이다 ─────────────────────────────
  //
  // ★ 운동 탭이 `if (loadError) return <오류화면>` 으로 조기 반환하는데,
  //   저장 실패의 원인은 대개 서버에 못 닿는 것이라 같은 이유로 fetchSessions 도
  //   실패해 loadError 가 선다. 즉 **둘은 거의 항상 같이 발생한다.**
  //   그래서 화면은 둘을 함께 그리고(workout.tsx 의 pendingSaveBanner 를 두 곳에서
  //   참조한다), 스토어는 한쪽이 다른 쪽을 지우지 않아야 한다.
  //   여기서 깨지면 배너가 조용히 사라져 복구 수단이 없어진다.
  describe('loadError 와 pendingSave 공존', () => {
    const PENDING = {
      session: {
        id: 'w-1', date: '2026-06-10', durationMinutes: 0, note: '',
        exercises: [{ ...BASE_EXERCISE, sets: [{ ...BASE_SET, id: 's1', completed: true }] }],
      } as unknown as WorkoutSession,
      durationMinutes: 42,
      caloriesBurned: 321,
      failedAt: 1_700_000_000_000,
    };

    it('★ fetchSessions 가 실패해 loadError 가 서도 pendingSave 는 남는다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('network down'));
      useWorkoutStore.setState({ pendingSave: PENDING, loadError: null });
      const { result } = renderHook(() => useWorkoutStore());

      await act(async () => { await result.current.fetchSessions(); });

      const s = useWorkoutStore.getState();
      expect(s.loadError).not.toBeNull();   // 오류 화면이 뜨는 조건
      expect(s.pendingSave).not.toBeNull(); // 그래도 배너가 그릴 것이 남아 있다
      expect(s.pendingSave!.durationMinutes).toBe(42);

      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
    });

    it('재시도가 성공하면 pendingSave 와 loadError 가 함께 풀린다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
      useWorkoutStore.setState({ pendingSave: PENDING, loadError: '기록을 불러올 수 없어요.' });
      const { result } = renderHook(() => useWorkoutStore());

      await act(async () => { await result.current.retryPendingSave(); });

      const s = useWorkoutStore.getState();
      expect(s.pendingSave).toBeNull();
      // retryPendingSave 가 끝에서 fetchSessions 를 부르므로 loadError 도 풀린다
      expect(s.loadError).toBeNull();
    });

    it('endSession 실패가 loadError 를 건드리지 않는다', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('down'));
      useWorkoutStore.setState({ loadError: '이전 오류', pendingSave: null });
      const { result } = renderHook(() => useWorkoutStore());

      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', completed: true });
        await result.current.endSession(0);
      });

      const s = useWorkoutStore.getState();
      expect(s.pendingSave).not.toBeNull();
      expect(s.loadError).toBe('이전 오류'); // 저장 경로가 목록 오류 상태를 덮어쓰지 않는다

      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
    });
  });

  // ─── 버리기 ────────────────────────────────────────────────────────────────
  describe('discardPendingSave', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    it('대기 상태와 디스크 사본을 모두 지운다', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockClear();
      useWorkoutStore.setState({
        pendingSave: {
          session: { id: 'w-1', date: '2026-06-10', durationMinutes: 0, note: '', exercises: [] } as unknown as WorkoutSession,
          durationMinutes: 42, caloriesBurned: 321, failedAt: 1,
        },
      });
      const { result } = renderHook(() => useWorkoutStore());

      act(() => { result.current.discardPendingSave(); });

      expect(useWorkoutStore.getState().pendingSave).toBeNull();
      expect((AsyncStorage.removeItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === 'workout_pending_save:v1',
      )).toBe(true);
    });
  });
});

// ─── calculateCaloriesBurned (pure function) ──────────────────────────────────

describe('calculateCaloriesBurned', () => {
  const makeSession = (category: string): WorkoutSession => ({
    id: 's-1',
    date: '2026-06-10',
    durationMinutes: 60,
    note: '',
    exercises: [{
      id: 'ex-1', name: 'test', category,
      sets: [], settings: [], tip: '', isSingleArm: false,
    }],
  });

  it('운동 시간 0이면 0 반환', () => {
    expect(calculateCaloriesBurned(makeSession('가슴'), 70, 0)).toBe(0);
  });

  it('양수 칼로리 반환', () => {
    expect(calculateCaloriesBurned(makeSession('가슴'), 70, 60)).toBeGreaterThan(0);
  });

  it('MET 정확성: 가슴(3.5) × 70kg × 1h = 245kcal', () => {
    expect(calculateCaloriesBurned(makeSession('가슴'), 70, 60)).toBe(245);
  });

  it('MET 정확성: 유산소(7.0) × 70kg × 1h = 490kcal', () => {
    expect(calculateCaloriesBurned(makeSession('유산소'), 70, 60)).toBe(490);
  });

  it('MET 정확성: 하체(5.0) × 70kg × 1h = 350kcal', () => {
    expect(calculateCaloriesBurned(makeSession('하체'), 70, 60)).toBe(350);
  });

  it('유산소 > 하체 > 일반 웨이트 순서', () => {
    const cardio = calculateCaloriesBurned(makeSession('유산소'), 70, 60);
    const lower  = calculateCaloriesBurned(makeSession('하체'), 70, 60);
    const chest  = calculateCaloriesBurned(makeSession('가슴'), 70, 60);
    expect(cardio).toBeGreaterThan(lower);
    expect(lower).toBeGreaterThan(chest);
  });

  it('체중 비례: 140kg는 70kg의 2배 칼로리', () => {
    const light = calculateCaloriesBurned(makeSession('가슴'), 70, 60);
    const heavy = calculateCaloriesBurned(makeSession('가슴'), 140, 60);
    expect(heavy).toBe(light * 2);
  });

  it('운동 시간 비례: 2시간은 1시간의 2배 칼로리', () => {
    const one = calculateCaloriesBurned(makeSession('가슴'), 70, 60);
    const two = calculateCaloriesBurned(makeSession('가슴'), 70, 120);
    expect(two).toBe(one * 2);
  });

  it('운동 없는 세션은 기본 MET(3.5) 적용', () => {
    const empty: WorkoutSession = {
      id: 's-1', date: '2026-06-10', durationMinutes: 60, note: '', exercises: [],
    };
    // avgMET = 3.5 (기본값), 70kg × 1h = 245kcal
    expect(calculateCaloriesBurned(empty, 70, 60)).toBe(245);
  });

  it('혼합 카테고리: 가슴(3.5)+유산소(7.0) 평균 MET = 5.25', () => {
    const session: WorkoutSession = {
      id: 's-1', date: '2026-06-10', durationMinutes: 60, note: '',
      exercises: [
        { id: 'ex-1', name: 'a', category: '가슴', sets: [], settings: [], tip: '', isSingleArm: false },
        { id: 'ex-2', name: 'b', category: '유산소', sets: [], settings: [], tip: '', isSingleArm: false },
      ],
    };
    // (3.5 + 7.0) / 2 × 70 × 1 = 5.25 × 70 = 367.5 → round → 368
    expect(calculateCaloriesBurned(session, 70, 60)).toBe(368);
  });
});
