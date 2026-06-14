import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * 쉬는날(Rest Day) — 사용자가 직접 지정한 휴식 날짜.
 * 요일 고정이 아니라 날짜(YYYY-MM-DD) 단위로 저장한다.
 * (user, date) 조합은 유일해 같은 날을 중복 지정할 수 없다.
 */
@Entity('rest_days')
@Unique(['user', 'date'])
export class RestDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  user: User;
}
