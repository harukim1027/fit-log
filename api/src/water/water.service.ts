import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaterLog } from './water-log.entity';

@Injectable()
export class WaterService {
  constructor(
    @InjectRepository(WaterLog)
    private waterRepo: Repository<WaterLog>,
  ) {}

  async getTotal(userId: string, date: string): Promise<number> {
    const logs = await this.waterRepo.find({ where: { user: { id: userId }, date } });
    return logs.reduce((sum, l) => sum + l.amount, 0);
  }

  async add(userId: string, date: string, amount: number): Promise<number> {
    const log = this.waterRepo.create({ date, amount, user: { id: userId } });
    await this.waterRepo.save(log);
    return this.getTotal(userId, date);
  }

  async reset(userId: string, date: string): Promise<void> {
    await this.waterRepo.delete({ user: { id: userId }, date });
  }
}