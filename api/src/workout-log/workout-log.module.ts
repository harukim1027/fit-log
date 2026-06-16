import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutLogService } from './workout-log.service';
import { WorkoutLogController } from './workout-log.controller';
import { ExerciseCatalogService } from './exercise-catalog.service';
import { WorkoutSession } from '../workout/workout-session.entity';
import { WorkoutExercise } from '../workout/workout-exercise.entity';
import { WorkoutSet } from '../workout/workout-set.entity';
import { Exercise } from '../exercise/exercise.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutSession,
      WorkoutExercise,
      WorkoutSet,
      Exercise,
    ]),
  ],
  providers: [WorkoutLogService, ExerciseCatalogService],
  controllers: [WorkoutLogController],
  exports: [WorkoutLogService],
})
export class WorkoutLogModule {}
