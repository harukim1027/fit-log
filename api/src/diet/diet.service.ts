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

  async getCalendar(userId: string, year: number, month: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${year}-${pad(month)}-01`;
    const end = `${year}-${pad(month)}-31`;
    const logs = await this.dietRepo
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.date >= :start', { start })
      .andWhere('log.date <= :end', { end })
      .getMany();
    const map: Record<string, number> = {};
    logs.forEach(l => { map[l.date] = (map[l.date] ?? 0) + l.calories; });
    return Object.entries(map).map(([date, calories]) => ({ date, calories: Math.round(calories) }));
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
