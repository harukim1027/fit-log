import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ default: 100 })
  amount: number;

  @Column({ default: 'g' })
  unit: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  user: User;
}