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

  async getSummary(userId: string, date: string) {
    const logs = await this.getByDate(userId, date);
    return {
      calories: Math.round(logs.reduce((s, l) => s + l.calories, 0)),
      protein:  Math.round(logs.reduce((s, l) => s + l.protein, 0) * 10) / 10,
      carbs:    Math.round(logs.reduce((s, l) => s + l.carbs, 0) * 10) / 10,
      fat:      Math.round(logs.reduce((s, l) => s + l.fat, 0) * 10) / 10,
      meals: {
        breakfast: logs.filter(l => l.mealType === 'breakfast').reduce((s, l) => s + l.calories, 0),
        lunch:     logs.filter(l => l.mealType === 'lunch').reduce((s, l) => s + l.calories, 0),
        dinner:    logs.filter(l => l.mealType === 'dinner').reduce((s, l) => s + l.calories, 0),
        snack:     logs.filter(l => l.mealType === 'snack').reduce((s, l) => s + l.calories, 0),
      },
    };
  }
}
