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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}
