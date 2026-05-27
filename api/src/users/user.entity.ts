import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { WorkoutSession } from '../workout/workout-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkoutSession, session => session.user)
  workoutSessions: WorkoutSession[];
}
