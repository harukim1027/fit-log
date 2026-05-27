import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSettingPreset } from './workout-setting-preset.entity';

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
}
