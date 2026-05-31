import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { WorkoutSession } from '../workout/workout-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: 'local' })
  provider: string;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: 2000 })
  targetCalories: number;

  @Column({ nullable: true })
  weight: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  goal: string;

  @Column({ default: false })
  isOnboardingDone: boolean;

  @Column({ default: 50 })
  targetCarbsRatio: number;

  @Column({ default: 30 })
  targetProteinRatio: number;

  @Column({ default: 20 })
  targetFatRatio: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkoutSession, session => session.user)
  workoutSessions: WorkoutSession[];
}
