import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSettingPreset } from './workout-setting-preset.entity';
import { WorkoutSettingsService } from './workout-settings.service';
import { WorkoutSettingsController } from './workout-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutSettingPreset])],
  providers: [WorkoutSettingsService],
  controllers: [WorkoutSettingsController],
  // 가입 직후 기본 항목을 깔기 위해 UsersModule 이 가져다 쓴다.
  exports: [WorkoutSettingsService],
})
export class WorkoutSettingsModule {}
