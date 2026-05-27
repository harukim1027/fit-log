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

  @ManyToOne(() => WorkoutSession, session => session.exercises)
  session: WorkoutSession;

  @OneToMany(() => WorkoutSet, set => set.exercise, { cascade: true })
  sets: WorkoutSet[];
}