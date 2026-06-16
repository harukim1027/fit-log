import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

/**
 * 코치 인사이트 1일 1회 캐시. (userId, date) 유니크 — 같은 날 두 번째 호출은
 * DB에서만 반환하고 LLM을 호출하지 않는다(비용 0).
 */
@Entity('coach_insight_cache')
@Unique(['userId', 'date'])
export class CoachInsightCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD (KST)

  @Column()
  kind: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true, type: 'varchar' })
  actionLabel: string | null;

  @Column({ nullable: true, type: 'varchar' })
  actionTarget: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
