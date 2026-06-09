import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { WorkoutSession } from './workout-session.entity';
import { WorkoutSet } from './workout-set.entity';

@Entity('workout_exercises')
export class WorkoutExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'simple-json', nullable: true })
  settings: { key: string; value: string }[];

  @Column({ nullable: true })
  tip: string;

  @Column({ default: false })
  isSingleArm: boolean;

  @Column({ default: false })
  differentSides: boolean;

  @Column({ type: 'simple-json', nullable: true })
  targetMuscles: string[];

  @Column({ type: 'int', nullable: true })
  restSeconds: number;

  @Column({ nullable: true })
  targetReps: string;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => WorkoutSession, session => session.exercises, { onDelete: 'CASCADE' })
  session: WorkoutSession;

  @OneToMany(() => WorkoutSet, set => set.exercise, { cascade: true })
  sets: WorkoutSet[];
}