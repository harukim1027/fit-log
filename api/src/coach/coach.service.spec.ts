import { CoachService } from './coach.service';
import type { InsightFacts } from './coach.schema';

function makeService(sessions: any[] = []) {
  const cacheRepo: any = {
    findOne: jest.fn().mockResolvedValue(null),
    create: (d: any) => ({ ...d }),
    save: jest.fn().mockResolvedValue({}),
  };
  const sessionRepo: any = { find: jest.fn().mockResolvedValue(sessions) };
  const service = new CoachService(cacheRepo, sessionRepo);
  return { service, cacheRepo, sessionRepo };
}

const facts = (f: Partial<InsightFacts>): InsightFacts => ({
  daysSinceLast: 1,
  sessionsLast7Days: 3,
  muscleSetCountsLast14Days: {},
  ...f,
});

describe('selectInsightKind (우선순위)', () => {
  const { service } = makeService();
  it('기록 없으면 first_time', () => {
    expect(service.selectInsightKind(facts({ daysSinceLast: null }))).toBe('first_time');
  });
  it('5일 이상 → long_break', () => {
    expect(service.selectInsightKind(facts({ daysSinceLast: 6 }))).toBe('long_break');
  });
  it('7일 운동 0~1회 → low_frequency', () => {
    expect(service.selectInsightKind(facts({ daysSinceLast: 2, sessionsLast7Days: 1 }))).toBe('low_frequency');
  });
  it('부위 편차 3배 이상 & max>=10 → imbalance_2w', () => {
    expect(
      service.selectInsightKind(facts({ muscleSetCountsLast14Days: { 가슴: 12, 복근: 3 } })),
    ).toBe('imbalance_2w');
  });
  it('편차 작으면 steady', () => {
    expect(
      service.selectInsightKind(facts({ muscleSetCountsLast14Days: { 가슴: 12, 등: 10 } })),
    ).toBe('steady');
  });
});

describe('getTodayInsight', () => {
  const NOW = Date.parse('2026-06-16T12:00:00Z');
  beforeAll(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterAll(() => (Date.now as jest.Mock).mockRestore());

  it('캐시 있으면 LLM/세션조회 없이 DB값 반환', async () => {
    const { service, cacheRepo, sessionRepo } = makeService();
    cacheRepo.findOne.mockResolvedValue({
      kind: 'steady',
      message: '꾸준히 잘하고 있어요',
      actionLabel: null,
      actionTarget: null,
    });
    const out = await service.getTodayInsight('u1');
    expect(out.kind).toBe('steady');
    expect(sessionRepo.find).not.toHaveBeenCalled();
  });

  it('캐시 미스 + LLM 불가 → 폴백 반환(캐시 저장 안 함)', async () => {
    // ANTHROPIC_API_KEY 미설정 → synthesize throw → 폴백
    const sessions = [
      {
        date: '2026-06-10', // 6일 전 → long_break
        exercises: [{ category: '등', sets: [{ completed: true }] }],
      },
    ];
    const { service, cacheRepo } = makeService(sessions);
    const out = await service.getTodayInsight('u1');
    expect(out.kind).toBe('long_break');
    expect(out.actionTarget).toBe('workout_start');
    expect(out.message).toContain('6일');
    expect(cacheRepo.save).not.toHaveBeenCalled();
  });
});

describe('extractFacts', () => {
  const NOW = Date.parse('2026-06-16T12:00:00Z');
  beforeAll(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterAll(() => (Date.now as jest.Mock).mockRestore());

  it('완료 세트만 카테고리별로 집계하고 경과일/7일 횟수 계산', async () => {
    const sessions = [
      {
        date: '2026-06-15', // 1일 전
        exercises: [
          { category: '가슴', sets: [{ completed: true }, { completed: true }, { completed: false }] },
        ],
      },
      {
        date: '2026-06-14',
        exercises: [{ category: '등', sets: [{ completed: true }] }],
      },
    ];
    const { service } = makeService(sessions);
    const f = await service.extractFacts('u1');
    expect(f.daysSinceLast).toBe(1);
    expect(f.sessionsLast7Days).toBe(2);
    expect(f.muscleSetCountsLast14Days).toEqual({ 가슴: 2, 등: 1 });
  });
});
