import { NotFoundException } from '@nestjs/common';
import { WorkoutService } from './workout.service';

// 인메모리 목 리포지토리로 update()의 날짜 저장 회귀를 검증한다.
// (히스토리 날짜 변경이 서버에 저장되지 않던 버그 — service가 date를 save 안 하던 문제)
function makeService(session: any) {
  const sessionRepo: any = {
    findOne: jest.fn().mockResolvedValue(session),
    save: jest.fn(async (s: any) => s),
  };
  const exerciseRepo: any = {
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    create: (d: any) => ({ ...d }),
    save: jest.fn(async (e: any) => ({ ...e, id: 'ex-1' })),
  };
  const setRepo: any = {
    create: (d: any) => ({ ...d }),
    save: jest.fn(async (s: any) => s),
  };
  const service = new WorkoutService(sessionRepo, exerciseRepo, setRepo);
  return { service, sessionRepo, exerciseRepo, setRepo };
}

const baseSession = () => ({
  id: 's1',
  date: '2026-07-01',
  note: '',
  durationMinutes: 0,
  user: { id: 'u1' },
  exercises: [{ id: 'e1', sets: [] }],
});

describe('WorkoutService.update — 날짜 저장 회귀', () => {
  it('date만 보내면 session.date를 갱신하고 save 한다 (앱 재시작 후 유지)', async () => {
    const session = baseSession();
    const { service, sessionRepo, exerciseRepo } = makeService(session);

    await service.update('s1', 'u1', { date: '2026-07-10' });

    expect(session.date).toBe('2026-07-10');
    expect(sessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', date: '2026-07-10' }),
    );
    // date만 변경 시 종목은 건드리지 않는다 (삭제/재생성 없음)
    expect(exerciseRepo.delete).not.toHaveBeenCalled();
  });

  it('존재하지 않거나 남의 세션이면 NotFound', async () => {
    const { service, sessionRepo } = makeService(baseSession());
    sessionRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.update('nope', 'u1', { date: '2026-07-10' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exercises와 함께 보내도 date가 반영된다', async () => {
    const session = baseSession();
    const { service, sessionRepo, exerciseRepo } = makeService(session);

    await service.update('s1', 'u1', {
      date: '2026-07-09',
      exercises: [{ name: '벤치프레스', category: '가슴', sets: [] }],
    });

    expect(session.date).toBe('2026-07-09');
    expect(sessionRepo.save).toHaveBeenCalled();
    expect(exerciseRepo.delete).toHaveBeenCalledWith({ session: { id: 's1' } });
  });
});
