import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachService } from './coach.service';
import { CoachController } from './coach.controller';
import { CoachInsightCache } from './coach-cache.entity';
import { WorkoutSession } from '../workout/workout-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CoachInsightCache, WorkoutSession])],
  providers: [CoachService],
  controllers: [CoachController],
  exports: [CoachService],
})
export class CoachModule {}
