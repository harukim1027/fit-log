import { useRoutineStore } from '../../store/routineStore';
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

const makeSession = (
  sets: WorkoutSession['exercises'][0]['sets'],
): WorkoutSession => ({
  id: 's-1',
  date: '2026-06-14',
  durationMinutes: 30,
  note: '',
  exercises: [
    {
      id: 'ex-1',
      name: '벤치프레스',
      category: '가슴',
      sets,
      settings: [],
      tip: '',
      isSingleArm: false,
    },
  ],
});

describe('routineStore.updateRoutineFromSession', () => {
  beforeEach(() => {
    useRoutineStore.setState({ routines: [], publicRoutines: [], loaded: true });
    jest.clearAllMocks();
  });

  // 회귀 방지: 루틴으로 한 운동에서 세트마다 다른 무게/횟수로 했을 때,
  // 루틴 갱신이 단일 defaultWeight/defaultReps로 합치면 안 되고 세트별로 보존해야 한다.
  it('세트별 무게/횟수를 sets로 보존 (단일값으로 합치지 않음)', async () => {
    const apiClient = require('../../lib/apiClient').default;
    const session = makeSession([
      { id: 's1', weight: 100, reps: 10, completed: true, unit: 'kg' },
      { id: 's2', weight: 110, reps: 8, completed: true, unit: 'kg' },
      { id: 's3', weight: 120, reps: 6, completed: true, unit: 'kg' },
    ]);

    await useRoutineStore.getState().updateRoutineFromSession('r-1', session);

    const patchCall = (apiClient.patch as jest.Mock).mock.calls.find(
      ([url]: [string]) => url === '/routine/r-1',
    );
    expect(patchCall).toBeDefined();
    const sets = patchCall[1].exercises[0].sets;
    expect(sets.map((s: any) => [s.targetWeight, s.targetReps])).toEqual([
      [100, 10],
      [110, 8],
      [120, 6],
    ]);
  });
});

/**
 * 서버의 `routines.exercises` 는 jsonb 라 구조가 강제되지 않는다. 필드가 빠지거나
 * 타입이 어긋난 행이 실제로 존재했고(운영 복원본에서 확인), 그게 화면까지 내려와
 * "예상 NaN분" · "벤치프레스 s" 로 렌더됐다. 진입점에서 막는다.
 */
describe('loadRoutines — 서버 데이터 정규화', () => {
  const apiClient = require('../../lib/apiClient').default;

  const load = async (exercises: any[]) => {
    apiClient.get.mockResolvedValueOnce({
      data: [{ id: 'r1', name: 'R', exercises, createdAt: '2026-01-01' }],
    });
    await useRoutineStore.getState().loadRoutines();
    return useRoutineStore.getState().routines[0].exercises[0];
  };

  it('defaultSets 가 없으면 3으로 채운다', async () => {
    const ex = await load([{ name: '벤치프레스', category: '가슴' }]);
    expect(ex.defaultSets).toBe(3);
  });

  it('sets 가 배열이면 그 길이를 defaultSets 로 쓴다', async () => {
    const ex = await load([
      { name: '스쿼트', category: '하체', sets: [{ setNumber: 1 }, { setNumber: 2 }] },
    ]);
    expect(ex.defaultSets).toBe(2);
  });

  it('sets 가 숫자면 버린다 — sets.length 가 undefined 라 소비하는 쪽이 빗나간다', async () => {
    const ex = await load([{ name: '벤치프레스', category: '가슴', sets: 3 }]);
    expect(ex.sets).toBeUndefined();
    expect(ex.defaultSets).toBe(3);
  });

  it('정상 값은 건드리지 않는다', async () => {
    const ex = await load([{ name: '데드리프트', category: '등', defaultSets: 5 }]);
    expect(ex.defaultSets).toBe(5);
  });

  it('defaultSets 가 0 이나 null 이어도 폴백한다', async () => {
    expect((await load([{ name: 'A', category: '가슴', defaultSets: 0 }])).defaultSets).toBe(3);
    expect((await load([{ name: 'B', category: '가슴', defaultSets: null }])).defaultSets).toBe(3);
  });

  it('exercises 가 배열이 아니어도 터지지 않는다', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [{ id: 'r1', name: 'R', exercises: null, createdAt: '2026-01-01' }],
    });
    await useRoutineStore.getState().loadRoutines();
    expect(useRoutineStore.getState().routines[0].exercises).toEqual([]);
  });
});

/**
 * 루틴 작성 초안. 라우트가 갈려도 살아 있어야 하고, dirty 판정이 미저장
 * 가드의 유일한 근거가 된다.
 */
describe('draft — 작성 중 루틴', () => {
  const store = () => useRoutineStore.getState();
  const seed = (over: any = {}) => ({
    kind: 'create' as const,
    id: null,
    name: '',
    color: '#000',
    exercises: [],
    sourceIds: [],
    ...over,
  });

  beforeEach(() => store().clearDraft());

  it('열자마자는 dirty 가 아니다 — 기존 값이 채워진 edit 도 마찬가지', () => {
    store().beginDraft(seed({ kind: 'edit', id: 'r1', name: '가슴날', exercises: [
      { name: '벤치프레스', category: '가슴', defaultSets: 3, key: 'k1' },
    ] }));
    expect(store().isDraftDirty()).toBe(false);
  });

  it('이름을 바꾸면 dirty', () => {
    store().beginDraft(seed({ name: 'A' }));
    store().patchDraft({ name: 'B' });
    expect(store().isDraftDirty()).toBe(true);
  });

  it('되돌리면 다시 dirty 가 아니다', () => {
    store().beginDraft(seed({ name: 'A' }));
    store().patchDraft({ name: 'B' });
    store().patchDraft({ name: 'A' });
    expect(store().isDraftDirty()).toBe(false);
  });

  it('종목을 추가하면 dirty — 종목 화면의 복귀 경로', () => {
    store().beginDraft(seed());
    store().addDraftExercise({ name: '스쿼트', category: '하체', defaultSets: 3 } as any);
    expect(store().draft!.exercises).toHaveLength(1);
    expect(store().draft!.exercises[0].key).toBeTruthy();
    expect(store().isDraftDirty()).toBe(true);
  });

  it('종목 편집은 key 를 유지한다 — 바뀌면 드래그 중 항목이 튄다', () => {
    store().beginDraft(seed({ exercises: [
      { name: '벤치프레스', category: '가슴', defaultSets: 3, key: 'keep-me' },
    ] }));
    store().updateDraftExercise(0, { name: '인클라인', category: '가슴', defaultSets: 4 } as any);
    expect(store().draft!.exercises[0].key).toBe('keep-me');
    expect(store().draft!.exercises[0].name).toBe('인클라인');
  });

  it('key 는 dirty 비교에서 빠진다', () => {
    store().beginDraft(seed({ exercises: [
      { name: 'A', category: '가슴', defaultSets: 3, key: 'k1' },
    ] }));
    store().setDraftExercises([{ name: 'A', category: '가슴', defaultSets: 3, key: 'k2' } as any]);
    expect(store().isDraftDirty()).toBe(false);
  });

  it('beginDraft 는 기존 초안을 덮어쓴다 — 진입 시 초기화가 곧 이것이다', () => {
    store().beginDraft(seed({ name: '이전' }));
    store().patchDraft({ name: '수정됨' });
    store().beginDraft(seed({ name: '새로' }));
    expect(store().draft!.name).toBe('새로');
    expect(store().isDraftDirty()).toBe(false);
  });

  it('초안이 없으면 dirty 가 아니고 액션이 터지지 않는다', () => {
    expect(store().isDraftDirty()).toBe(false);
    store().patchDraft({ name: 'x' });
    store().addDraftExercise({ name: 'A', category: '가슴', defaultSets: 3 } as any);
    expect(store().draft).toBeNull();
  });

  it('reset(로그아웃·탈퇴)은 초안도 버린다', () => {
    store().beginDraft(seed({ name: 'A' }));
    store().reset();
    expect(store().draft).toBeNull();
  });
});
