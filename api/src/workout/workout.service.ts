import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from './workout-session.entity';

@Injectable()
export class WorkoutService {
  constructor(
    @InjectRepository(WorkoutSession)
    private sessionRepo: Repository<WorkoutSession>,
  ) {}

  async create(userId: string, data: any): Promise<WorkoutSession> {
    const session = this.sessionRepo.create({
      ...data,
      user: { id: userId },
    });
    return this.sessionRepo.save(session) as unknown as WorkoutSession;
  }

  async findAll(userId: string): Promise<WorkoutSession[]> {
    return this.sessionRepo.find({
      where: { user: { id: userId } },
      relations: { exercises: { sets: true } },
      order: { date: 'DESC' },
    });
  }

  async findByDate(userId: string, date: string): Promise<WorkoutSession | null> {
    return this.sessionRepo.findOne({
      where: { user: { id: userId }, date },
      relations: { exercises: { sets: true } },
    });
  }
}