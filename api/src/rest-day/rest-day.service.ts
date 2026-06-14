import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestDay } from './rest-day.entity';

@Injectable()
export class RestDayService {
  constructor(
    @InjectRepository(RestDay)
    private restDayRepo: Repository<RestDay>,
  ) {}

  /** 사용자의 쉬는날 목록을 날짜 오름차순으로 반환 (YYYY-MM-DD 문자열 배열) */
  async getRestDays(userId: string): Promise<string[]> {
    const rows = await this.restDayRepo.find({
      where: { user: { id: userId } },
      order: { date: 'ASC' },
    });
    return rows.map((r) => r.date);
  }

  /**
   * 쉬는날을 지정한다. 이미 지정된 날이면 그대로 둔다(멱등).
   * 갱신된 전체 목록을 반환해 클라이언트가 상태를 동기화할 수 있게 한다.
   */
  async addRestDay(userId: string, date: string): Promise<string[]> {
    const existing = await this.restDayRepo.findOne({
      where: { user: { id: userId }, date },
    });
    if (!existing) {
      await this.restDayRepo.save(
        this.restDayRepo.create({ date, user: { id: userId } }),
      );
    }
    return this.getRestDays(userId);
  }

  /** 쉬는날을 해제한다. 갱신된 전체 목록을 반환. */
  async removeRestDay(userId: string, date: string): Promise<string[]> {
    await this.restDayRepo.delete({ user: { id: userId }, date });
    return this.getRestDays(userId);
  }
}
