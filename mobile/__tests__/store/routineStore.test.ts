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
