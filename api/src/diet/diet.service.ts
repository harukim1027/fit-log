import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DietLog } from './diet-log.entity';

@Injectable()
export class DietService {
  constructor(
    @InjectRepository(DietLog)
    private dietRepo: Repository<DietLog>,
  ) {}

  async addFood(userId: string, data: any): Promise<DietLog> {
    const log = this.dietRepo.create({ ...data, user: { id: userId } });
    return this.dietRepo.save(log) as unknown as DietLog;
  }

  async getByDate(userId: string, date: string): Promise<DietLog[]> {
    return this.dietRepo.find({
      where: { user: { id: userId }, date },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteFood(userId: string, id: string): Promise<void> {
    await this.dietRepo.delete({ id, user: { id: userId } });
  }

  async getTotalCalories(userId: string, date: string): Promise<number> {
    const logs = await this.getByDate(userId, date);
    return logs.reduce((sum, log) => sum + log.calories, 0);
  }
}
