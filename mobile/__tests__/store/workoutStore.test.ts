import { act, renderHook } from '@testing-library/react-native';
import { useWorkoutStore, calculateCaloriesBurned } from '../../store/workoutStore';
import type { WorkoutSession } from '../../types/workout';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
  setUnauthorizedHandler: jest.fn(),
}));

const INITIAL_STATE = {
  activeSession: null,
  sessions: [],
  isLoading: false,
  sessionStartTime: null,
  workoutElapsed: 0,
  workoutPaused: false,
  exerciseHistoryCache: new Map(),
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
        const r = await result.current.endSession(0);
        expect(r).toBe('saved');
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

    it('완료 세트만 저장 — 미완료 세트는 제외', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockClear();
      const { result } = renderHook(() => useWorkoutStore());
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', weight: 100, reps: 10, completed: true });
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-2', weight: 100, reps: 10, completed: false });
        await result.current.endSession(0);
      });
      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      const savedSets = postCall[1].exercises[0].sets;
      expect(savedSets).toHaveLength(1);
      expect(savedSets[0].completed).toBe(true);
    });

    it('완료 세트가 하나도 없으면 저장하지 않고 empty 반환', async () => {
      const apiClient = require('../../lib/apiClient').default;
      (apiClient.post as jest.Mock).mockClear();
      const { result } = renderHook(() => useWorkoutStore());
      let r: 'empty' | 'saved' | undefined;
      await act(async () => {
        result.current.startSession();
        result.current.addExercise(BASE_EXERCISE);
        result.current.addSet('ex-1', { ...BASE_SET, id: 'set-1', completed: false });
        r = await result.current.endSession(0);
      });
      expect(r).toBe('empty');
      const postCall = (apiClient.post as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/workout',
      );
      expect(postCall).toBeUndefined();
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
