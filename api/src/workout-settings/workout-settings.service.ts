import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSettingPreset } from './workout-setting-preset.entity';
import { DEFAULT_SETTING_KEYS } from './default-setting-keys';

@Injectable()
export class WorkoutSettingsService {
  constructor(
    @InjectRepository(WorkoutSettingPreset)
    private repo: Repository<WorkoutSettingPreset>,
  ) {}

  findAll(userId: string): Promise<WorkoutSettingPreset[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: string, name: string): Promise<WorkoutSettingPreset> {
    const preset = this.repo.create({ name, user: { id: userId } });
    return this.repo.save(preset);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.repo.delete({ id, user: { id: userId } });
  }

  /**
   * 기본 항목 중 **없는 것만** 채워 넣고 전체 목록을 돌려준다.
   *
   * `(userId, name)` 유니크 제약이 없으므로 중복 방지는 이 차집합 계산이
   * 전적으로 책임진다. 이미 있는 이름은 건드리지 않으므로, 사용자가 만든
   * 커스텀 항목도 그대로 남는다.
   *
   * 이 메서드는 **사용자가 명시적으로 부를 때만** 실행된다.
   * 조회(`findAll`)가 0행일 때 자동으로 채우지 않는 이유는, 그렇게 하면
   * "아직 시드 전"과 "사용자가 전부 지웠다"가 DB에서 구분되지 않아 다 지워도
   * 다음 진입에 되살아나기 때문이다. 구분하려면 플래그 컬럼이 필요한데
   * 지금은 스키마를 바꿀 수 없다.
   */
  async restore(userId: string): Promise<WorkoutSettingPreset[]> {
    const current = await this.findAll(userId);
    const have = new Set(current.map((p) => p.name));
    const missing = DEFAULT_SETTING_KEYS.filter((k) => !have.has(k));
    // 순서대로 넣어야 createdAt ASC 정렬이 기본 목록 순서와 같아진다.
    for (const name of missing) {
      await this.create(userId, name);
    }
    return this.findAll(userId);
  }

  /**
   * 가입 직후 기본 항목을 깔아 준다.
   *
   * **실패해도 예외를 밖으로 던지지 않는다.** 시드가 실패했다고 회원가입이
   * 무산되면 안 되고, 실패하더라도 사용자가 "기본 항목 되돌리기"로 스스로
   * 복구할 수 있다.
   */
  async seedDefaults(userId: string): Promise<void> {
    try {
      for (const name of DEFAULT_SETTING_KEYS) {
        await this.create(userId, name);
      }
    } catch (e: any) {
      console.error('[seedDefaults] 실패 — 가입은 계속한다:', e?.message);
    }
  }
}
