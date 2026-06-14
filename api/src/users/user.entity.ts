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

  // double precision: 몸무게/키는 소수점(예: 70.5kg, 175.5cm)이 들어올 수 있어
  // integer 컬럼이면 소수 저장 시 Postgres가 에러를 던져 500이 난다.
  @Column({ type: 'double precision', nullable: true })
  weight: number;

  @Column({ type: 'double precision', nullable: true })
  height: number;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  goal: string;

  @Column({ nullable: true })
  weeklyGoal: number;

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
