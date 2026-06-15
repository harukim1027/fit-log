import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('routines')
export class Routine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: [] })
  exercises: { name: string; category: string; defaultSets: number }[];

  @Column({ default: false })
  isPublic: boolean;

  @Column({ nullable: true, unique: true })
  shareCode: string;

  @Column({ default: 0 })
  copyCount: number;

  @Column({ default: 0 })
  orderIndex: number;

  // 주간 볼륨 차트에서 루틴별 색상 표시용 (hex). 생성 시 자동 할당, 사용자가 변경 가능.
  @Column({ nullable: true })
  color: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}
