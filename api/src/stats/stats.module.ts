import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { WorkoutModule } from '../workout/workout.module';

@Module({
  imports: [WorkoutModule],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}