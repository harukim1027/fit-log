import { ExerciseCatalogService } from './exercise-catalog.service';

// EXERCISE_NAME_KO에 'pull-up' → '풀업'이 정확히 존재하므로 결정적으로 검증 가능.
function makeService(rows: { id: string; name: string; bodyPart: string }[]) {
  const repo: any = { find: jest.fn().mockResolvedValue(rows) };
  return new ExerciseCatalogService(repo);
}

describe('ExerciseCatalogService.resolve', () => {
  it('정확 일치 + bodyPart→카테고리 환산', async () => {
    const svc = makeService([{ id: 'p1', name: 'pull-up', bodyPart: 'Back' }]);
    const res = await svc.resolve('풀업');
    expect(res).toEqual({ catalogId: 'p1', name: '풀업', category: '등' });
  });

  it('별칭(턱걸이→풀업)으로 매칭', async () => {
    const svc = makeService([{ id: 'p1', name: 'pull-up', bodyPart: 'Back' }]);
    const res = await svc.resolve('턱걸이');
    expect(res).toMatchObject({ name: '풀업', category: '등' });
  });

  it('카탈로그 행이 없으면 카테고리는 기타로 폴백(매칭 자체는 성공)', async () => {
    const svc = makeService([]); // DB에 행 없음
    const res = await svc.resolve('풀업');
    expect(res).toMatchObject({ name: '풀업', category: '기타', catalogId: '' });
  });

  it('매칭 실패는 null', async () => {
    const svc = makeService([]);
    expect(await svc.resolve('존재하지않는운동xyz123')).toBeNull();
    expect(await svc.resolve('')).toBeNull();
  });
});
