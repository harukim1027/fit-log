import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSettingPreset } from './workout-setting-preset.entity';
import { WorkoutSettingsService } from './workout-settings.service';
import { WorkoutSettingsController } from './workout-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutSettingPreset])],
  providers: [WorkoutSettingsService],
  controllers: [WorkoutSettingsController],
})
export class WorkoutSettingsModule {}
