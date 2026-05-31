import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { WorkoutExercise } from './workout-exercise.entity';

@Entity('workout_sets')
export class WorkoutSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('float')
  weight: number;

  @Column('int')
  reps: number;

  @Column({ type: 'float', nullable: true })
  weightR: number;

  @Column({ default: true })
  completed: boolean;

  @ManyToOne(() => WorkoutExercise, exercise => exercise.sets, { onDelete: 'CASCADE' })
  exercise: WorkoutExercise;
}