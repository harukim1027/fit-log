import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Routine } from './routine.entity';

@Injectable()
export class RoutineService {
  constructor(
    @InjectRepository(Routine) private routineRepo: Repository<Routine>,
  ) {}

  findAll(userId: string) {
    return this.routineRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async create(userId: string, data: { name: string; exercises: any[] }) {
    const routine = this.routineRepo.create({ ...data, userId });
    return this.routineRepo.save(routine);
  }

  async update(id: string, userId: string, data: Partial<{ name: string; exercises: any[] }>) {
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
    const copy = this.routineRepo.create({
      name: source.name,
      exercises: source.exercises,
      userId,
    });
    return this.routineRepo.save(copy);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
