import { WorkoutLogService } from './workout-log.service';
import * as parser from './workout-parser';
import type { Workout } from './workout.schema';

// 인메모리 목으로 코어/quickLog/manual/undo 흐름을 검증한다.
function makeService() {
  const catalog = { resolve: jest.fn(), resolveById: jest.fn() };

  let savedExId = 0;
  const exerciseRepo: any = {
    create: (data: any) => ({ ...data }),
    save: (ex: any) => Promise.resolve({ ...ex, id: `ex-${++savedExId}` }),
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const setRepo: any = { create: (data: any) => ({ ...data }) };

  let session: any = null;
  const sessionRepo: any = {
    findOne: jest.fn(() => Promise.resolve(session)),
    create: (data: any) => ({ ...data }),
    save: (s: any) => {
      session = { ...s, id: s.id ?? 'sess-1', exercises: s.exercises ?? [] };
      return Promise.resolve(session);
    },
  };

  const service = new WorkoutLogService(
    catalog as any,
    sessionRepo,
    exerciseRepo,
    setRepo,
  );
  return {
    service,
    catalog,
    sessionRepo,
    exerciseRepo,
    setRepo,
    setSession: (s: any) => (session = s),
  };
}

const parseSpy = () => jest.spyOn(parser, 'parseWorkout');
afterEach(() => jest.restoreAllMocks());

describe('addExercisesToSession (저장 코어)', () => {
  it('카탈로그 resolve된 exerciseId만 저장하고 source를 세트에 태깅', async () => {
    const { service, catalog, sessionRepo } = makeService();
    sessionRepo.findOne.mockResolvedValue({ id: 'sess-1', exercises: [] });
    catalog.resolveById.mockResolvedValue({ catalogId: 'c1', name: '벤치프레스', category: '가슴' });

    const saved = await service.addExercisesToSession(
      'u1',
      'sess-1',
      [{ exerciseId: 'c1', sets: [{ weight: 60, reps: 5 }, { weight: 60, reps: 5 }] }],
      'manual',
    );

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ exerciseId: 'c1', name: '벤치프레스', category: '가슴', setCount: 2, source: 'manual' });
  });

  it('카탈로그에 없는 exerciseId는 건너뛴다 (LLM/클라 출력 직접 신뢰 금지)', async () => {
    const { service, catalog, sessionRepo } = makeService();
    sessionRepo.findOne.mockResolvedValue({ id: 'sess-1', exercises: [] });
    catalog.resolveById.mockResolvedValue(null);

    const saved = await service.addExercisesToSession(
      'u1',
      'sess-1',
      [{ exerciseId: '존재안함', sets: [{ weight: 0, reps: 0 }] }],
      'manual',
    );
    expect(saved).toHaveLength(0);
  });

  it('세션이 본인 것이 아니면 NotFound', async () => {
    const { service, sessionRepo } = makeService();
    sessionRepo.findOne.mockResolvedValue(null);
    await expect(
      service.addExercisesToSession('u1', 'sess-x', [], 'manual'),
    ).rejects.toThrow('운동 기록을 찾을 수 없어요');
  });
});

describe('quickLog (NL → 코어)', () => {
  it('명확한 입력은 오늘 세션에 즉시 저장 + undoIds 반환 (source nl)', async () => {
    const { service, catalog } = makeService();
    parseSpy().mockResolvedValue({
      exercises: [{ name: '벤치', sets: 5, reps: 5, weight_kg: 60, confidence: 'high' }],
      ambiguous: false,
      clarification_question: null,
    });
    catalog.resolve.mockResolvedValue({ catalogId: 'c1', name: '벤치프레스', category: '가슴' });
    catalog.resolveById.mockResolvedValue({ catalogId: 'c1', name: '벤치프레스', category: '가슴' });

    const res = await service.quickLog('u1', '벤치 60 5x5');

    expect(res.status).toBe('saved');
    expect(res.saved).toHaveLength(1);
    expect(res.saved![0]).toMatchObject({ name: '벤치프레스', category: '가슴', setCount: 5, source: 'nl' });
    expect(res.undoIds).toEqual(res.saved!.map((s) => s.id));
    expect(res.unmatched).toHaveLength(0);
  });

  it('모호하면 저장하지 않고 되묻는다', async () => {
    const { service, catalog, exerciseRepo } = makeService();
    const saveSpy = jest.spyOn(exerciseRepo, 'save');
    parseSpy().mockResolvedValue({ exercises: [], ambiguous: true, clarification_question: '어떤 운동?' });

    const res = await service.quickLog('u1', '오늘 좀 했음');

    expect(res).toEqual({ status: 'needs_clarification', question: '어떤 운동?' });
    expect(catalog.resolve).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('카탈로그에 없는 운동명은 unmatched로 분리되고 저장되지 않는다', async () => {
    const { service, catalog } = makeService();
    parseSpy().mockResolvedValue({
      exercises: [{ name: '듣보운동', sets: 3, reps: 10, weight_kg: null, confidence: 'medium' }],
      ambiguous: false,
      clarification_question: null,
    });
    catalog.resolve.mockResolvedValue(null);

    const res = await service.quickLog('u1', '듣보운동 3세트');

    expect(res.saved).toHaveLength(0);
    expect(res.undoIds).toHaveLength(0);
    expect(res.unmatched).toEqual([{ name: '듣보운동', sets: 3, reps: 10, weight_kg: null }]);
  });

  it('같은 날 다시 입력하면 기존 오늘 세션에 누적(새 세션 X)', async () => {
    const { service, catalog, sessionRepo, setSession } = makeService();
    setSession({ id: 'sess-1', exercises: [{ id: 'old', order: 0 }] });
    const createSpy = jest.spyOn(sessionRepo, 'create');
    catalog.resolve.mockResolvedValue({ catalogId: 'c1', name: '스쿼트', category: '하체' });
    catalog.resolveById.mockResolvedValue({ catalogId: 'c1', name: '스쿼트', category: '하체' });
    parseSpy().mockResolvedValue({
      exercises: [{ name: '스쿼트', sets: 3, reps: 8, weight_kg: 100, confidence: 'high' }],
      ambiguous: false,
      clarification_question: null,
    });

    const res = await service.quickLog('u1', '스쿼트 100 3x8');

    expect(res.sessionId).toBe('sess-1');
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe('addManual (수동 → 코어)', () => {
  it('source manual로 저장하고 undoIds 반환', async () => {
    const { service, catalog, sessionRepo } = makeService();
    sessionRepo.findOne.mockResolvedValue({ id: 'sess-1', exercises: [] });
    catalog.resolveById.mockResolvedValue({ catalogId: 'c1', name: '데드리프트', category: '등' });

    const res = await service.addManual('u1', 'sess-1', [
      { exerciseId: 'c1', sets: [{ weight: 140, reps: 3 }] },
    ]);

    expect(res.status).toBe('saved');
    expect(res.saved![0]).toMatchObject({ source: 'manual', name: '데드리프트' });
    expect(res.undoIds).toEqual(['ex-1']);
  });
});

describe('undo', () => {
  it('본인 종목이면 삭제', async () => {
    const { service, exerciseRepo } = makeService();
    exerciseRepo.find.mockResolvedValue([{ id: 'ex-1' }]);
    const delSpy = jest.spyOn(exerciseRepo, 'delete');
    const res = await service.undo('u1', ['ex-1']);
    expect(res).toEqual({ status: 'undone' });
    expect(delSpy).toHaveBeenCalled();
  });

  it('빈 ids는 아무것도 하지 않는다', async () => {
    const { service, exerciseRepo } = makeService();
    const delSpy = jest.spyOn(exerciseRepo, 'delete');
    const res = await service.undo('u1', []);
    expect(res).toEqual({ status: 'undone' });
    expect(delSpy).not.toHaveBeenCalled();
  });
});
