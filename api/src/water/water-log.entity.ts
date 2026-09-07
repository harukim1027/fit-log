import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('water_logs')
export class WaterLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column('int')
  amount: number;

  @CreateDateColumn()
  createdAt: Date;

  // onDelete: 'CASCADE' — 계정 탈퇴 시 함께 삭제.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}