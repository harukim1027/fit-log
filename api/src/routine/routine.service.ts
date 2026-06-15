import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Routine } from './routine.entity';

// 루틴 자동 색상 풀 (프론트 routineStore의 ROUTINE_COLOR_POOL과 동일 순서 유지)
const ROUTINE_COLOR_POOL = [
  '#F07A95', // 분홍
  '#2E82F0', // 파랑
  '#4FA98C', // 초록
  '#9B7EDE', // 보라
  '#E89B4F', // 주황
  '#54B0C4', // 청록
  '#D97AB8', // 자홍
  '#7C8B3D', // 올리브
];

@Injectable()
export class RoutineService {
  constructor(
    @InjectRepository(Routine) private routineRepo: Repository<Routine>,
  ) {}

  /** 안 쓰인 색상 우선, 다 쓰면 개수 기준 순환 */
  private getNextColor(existing: Routine[]): string {
    const used = existing.map((r) => r.color).filter(Boolean);
    const unused = ROUTINE_COLOR_POOL.find((c) => !used.includes(c));
    return unused ?? ROUTINE_COLOR_POOL[existing.length % ROUTINE_COLOR_POOL.length];
  }

  async findAll(userId: string) {
    const routines = await this.routineRepo.find({
      where: { userId },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });
    // 마이그레이션(지연): 색상 없는 기존 루틴에 풀을 순서대로 순환 할당 후 1회 저장
    const missing = routines.filter((r) => !r.color);
    if (missing.length > 0) {
      routines.forEach((r, i) => {
        if (!r.color) r.color = ROUTINE_COLOR_POOL[i % ROUTINE_COLOR_POOL.length];
      });
      await this.routineRepo.save(missing);
    }
    return routines;
  }

  async combine(userId: string, data: { routineIds: string[]; name: string; exercises: any[] }) {
    const existing = await this.routineRepo.find({ where: { userId } });
    const routine = this.routineRepo.create({
      name: data.name,
      exercises: data.exercises,
      userId,
      color: this.getNextColor(existing),
    });
    return this.routineRepo.save(routine);
  }

  async reorderRoutines(userId: string, ids: string[]) {
    await Promise.all(
      ids.map((id, index) => this.routineRepo.update({ id, userId }, { orderIndex: index }))
    );
    return this.findAll(userId);
  }

  async create(userId: string, data: { name: string; exercises: any[]; color?: string }) {
    const existing = await this.routineRepo.find({ where: { userId } });
    const color = data.color ?? this.getNextColor(existing);
    const routine = this.routineRepo.create({ ...data, userId, color });
    return this.routineRepo.save(routine);
  }

  async update(id: string, userId: string, data: Partial<{ name: string; exercises: any[]; color: string }>) {
    const routine = await this.routineRepo.findOne({ where: { id, userId } });
    if (!routine) throw new NotFoundException();
    Object.assign(routine, data);
    return this.routineRepo.save(routine);
  }

  async remove(id: string, userId: string) {
    const routine = await this.routineRepo.findOne({ where: { id, userId } });
    if (!routine) throw new NotFoundException();
    await this.routineRepo.remove(routine);
  }

  async share(id: string, userId: string) {
    const routine = await this.routineRepo.findOne({ where: { id, userId } });
    if (!routine) throw new NotFoundException();
    if (!routine.shareCode) {
      routine.shareCode = this.generateCode();
    }
    routine.isPublic = true;
    return this.routineRepo.save(routine);
  }

  async unshare(id: string, userId: string) {
    const routine = await this.routineRepo.findOne({ where: { id, userId } });
    if (!routine) throw new NotFoundException();
    routine.isPublic = false;
    return this.routineRepo.save(routine);
  }

  async explore(sort: 'latest' | 'popular' = 'latest') {
    const order = sort === 'popular'
      ? { copyCount: 'DESC' as const }
      : { createdAt: 'DESC' as const };
    const routines = await this.routineRepo.find({
      where: { isPublic: true },
      order,
      take: 50,
      relations: { user: true },
    });
    return routines.map(r => ({
      id: r.id,
      name: r.name,
      exercises: r.exercises,
      copyCount: r.copyCount,
      shareCode: r.shareCode,
      createdAt: r.createdAt,
      authorName: r.user?.name ?? '익명',
    }));
  }

  async findByCode(code: string) {
    const routine = await this.routineRepo.findOne({
      where: { shareCode: code.toUpperCase(), isPublic: true },
      relations: { user: true },
    });
    if (!routine) throw new NotFoundException('존재하지 않는 코드예요');
    return {
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises,
      copyCount: routine.copyCount,
      shareCode: routine.shareCode,
      authorName: routine.user?.name ?? '익명',
    };
  }

  async copy(id: string, userId: string) {
    const source = await this.routineRepo.findOne({ where: { id, isPublic: true } });
    if (!source) throw new NotFoundException();
    source.copyCount += 1;
    await this.routineRepo.save(source);
    const existing = await this.routineRepo.find({ where: { userId } });
    const copy = this.routineRepo.create({
      name: source.name,
      exercises: source.exercises,
      userId,
      color: this.getNextColor(existing),
    });
    return this.routineRepo.save(copy);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
