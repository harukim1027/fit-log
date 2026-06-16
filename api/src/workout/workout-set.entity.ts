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

  @Column({ default: true })
  completed: boolean;

  @Column({ nullable: true, default: 'kg' })
  unit: string;

  // 이 세트가 어디서 입력됐는지: 'nl'(자연어 빠른 기록) | 'manual'(수동 폼) | null(기존 앱 로거)
  @Column({ nullable: true })
  source: string;

  @ManyToOne(() => WorkoutExercise, exercise => exercise.sets, { onDelete: 'CASCADE' })
  exercise: WorkoutExercise;
}