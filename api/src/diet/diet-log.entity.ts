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

  @ManyToOne(() => User)
  user: User;
}