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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.workoutSessions)
  user: User;

  @OneToMany(() => WorkoutExercise, exercise => exercise.session, { cascade: true })
  exercises: WorkoutExercise[];
}