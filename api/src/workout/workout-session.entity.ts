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

  // onDelete: 'CASCADE' — 계정 탈퇴 시 세션이 함께 지워진다.
  // 없으면 users 행 삭제가 FK 위반으로 실패한다.
  // workout_exercises·workout_sets 는 이미 CASCADE 라 여기서부터 연쇄된다.
  @ManyToOne(() => User, user => user.workoutSessions, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => WorkoutExercise, exercise => exercise.session, { cascade: true })
  exercises: WorkoutExercise[];
}