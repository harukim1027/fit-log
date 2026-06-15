import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { WorkoutExercise } from './workout-exercise.entity';

@Entity('workout_sessions')
export class WorkoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  durationMinutes: number;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'float', nullable: true, default: null })
  caloriesBurned: number;

  // 이 세션이 시작된 루틴 id (통계 차트 루틴별 색상용). 개별 운동이면 null.
  @Column({ nullable: true })
  fromRoutineId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.workoutSessions)
  user: User;

  @OneToMany(() => WorkoutExercise, exercise => exercise.session, { cascade: true })
  exercises: WorkoutExercise[];
}