import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('custom_foods')
export class CustomFood {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

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

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: 0 })
  copyCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
