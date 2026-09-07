import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('diet_logs')
export class DietLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  mealType: string;

  @Column()
  foodName: string;

  @Column('float')
  calories: number;

  @Column('float')
  protein: number;

  @Column('float')
  carbs: number;

  @Column('float')
  fat: number;

  @Column('float')
  amount: number;

  @Column()
  unit: string;

  @Column({ nullable: true })
  snackCardId: string;

  @CreateDateColumn()
  createdAt: Date;

  // onDelete: 'CASCADE' — 계정 탈퇴 시 함께 삭제.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}