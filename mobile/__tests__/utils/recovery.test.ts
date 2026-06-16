import {
  getCategoryRecovery,
  getAllCategoryRecoveries,
} from '../../utils/recovery';
import type { WorkoutSession } from '../../types/workout';

// 고정 now: 2026-06-16T12:00:00Z
const NOW = Date.parse('2026-06-16T12:00:00Z');

const mkSession = (date: string, category: string, completed = true): WorkoutSession =>
  ({
    id: date,
    date,
    durationMinutes: 0,
    note: '',
    exercises: [
      {
        id: 'e1',
        name: '운동',
        category,
        sets: [{ id: 's1', weight: 50, reps: 10, completed }],
      },
    ],
  }) as unknown as WorkoutSession;

const hours48 = () => 48;

beforeAll(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
afterAll(() => (Date.now as jest.Mock).mockRestore());

describe('getCategoryRecovery', () => {
  it('기록 없으면 ready + hoursSinceLastWorkout=null', () => {
    const r = getCategoryRecovery('가슴', [], hours48);
    expect(r.status).toBe('ready');
    expect(r.hoursSinceLastWorkout).toBeNull();
  });

  it('오늘(경과<50%) → rest 🔴', () => {
    // 2026-06-16 00:00Z 기준 12h 경과, 12/48=0.25 < 0.5
    const r = getCategoryRecovery('가슴', [mkSession('2026-06-16', '가슴')], hours48);
    expect(r.status).toBe('rest');
  });

  it('어제(50~100%) → caution 🟡', () => {
    // 36h 경과, 36/48=0.75
    const r = getCategoryRecovery('가슴', [mkSession('2026-06-15', '가슴')], hours48);
    expect(r.status).toBe('caution');
  });

  it('충분히 지났으면(100%+) → ready 🟢', () => {
    // 156h 경과, 156/48=3.25
    const r = getCategoryRecovery('가슴', [mkSession('2026-06-10', '가슴')], hours48);
    expect(r.status).toBe('ready');
  });

  it('완료 세트가 없으면 무시(=ready)', () => {
    const r = getCategoryRecovery('가슴', [mkSession('2026-06-16', '가슴', false)], hours48);
    expect(r.status).toBe('ready');
    expect(r.hoursSinceLastWorkout).toBeNull();
  });

  it('다른 카테고리만 있으면 해당 부위는 ready', () => {
    const r = getCategoryRecovery('등', [mkSession('2026-06-16', '가슴')], hours48);
    expect(r.status).toBe('ready');
  });

  it('가장 최근 세션 기준으로 계산', () => {
    const r = getCategoryRecovery(
      '가슴',
      [mkSession('2026-06-10', '가슴'), mkSession('2026-06-16', '가슴')],
      hours48,
    );
    expect(r.status).toBe('rest'); // 최근(오늘) 기준
  });
});

describe('getAllCategoryRecoveries', () => {
  it('7개 기본 카테고리를 모두 반환', () => {
    const all = getAllCategoryRecoveries([], hours48);
    expect(all.map((r) => r.category)).toEqual(['가슴', '등', '하체', '어깨', '팔', '복근', '유산소']);
    expect(all.every((r) => r.status === 'ready')).toBe(true);
  });
});
