import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { WorkoutSession } from '../workout/workout-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  /**
   * bcrypt 해시. **`select: false` 라 기본 조회에 포함되지 않는다.**
   *
   * 전에는 `GET /users/me` 와 `PATCH /users/me` 가 User 엔티티를 그대로
   * 반환하면서 해시를 응답 본문에 실어 보냈다(실측 확인). 클라이언트가 알
   * 필요가 없는 값이고, 유출되면 오프라인 대입 공격의 표면이 된다.
   *
   * 응답 직전에 지우는 대신 조회 자체에서 빼는 이유: 새 반환 경로가 생겨도
   * 자동으로 안전하다. 지우는 방식은 경로마다 기억해야 한다.
   *
   * **이 값이 필요한 곳은 이메일 로그인 한 곳뿐이다.** `findByEmailForAuth`
   * 가 `addSelect` 로 명시적으로 가져온다. 다른 조회 경로에서 이 값을 쓰려
   * 하면 `undefined` 다 — 인증 로직을 새로 만들 때 주의할 것.
   */
  @Column({ nullable: true, select: false })
  password: string;

  @Column({ default: 'local' })
  provider: string;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: 2000 })
  targetCalories: number;

  // double precision: 몸무게/키는 소수점(예: 70.5kg, 175.5cm)이 들어올 수 있어
  // integer 컬럼이면 소수 저장 시 Postgres가 에러를 던져 500이 난다.
  @Column({ type: 'double precision', nullable: true })
  weight: number;

  @Column({ type: 'double precision', nullable: true })
  height: number;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  goal: string;

  /**
   * 주간 운동 목표 횟수. 홈의 "이번 주 운동 N/M"의 분모다.
   *
   * default 4 — 이 값이 없던 동안 홈이 `user?.weeklyGoal ?? 4`로 자체 폴백해
   * 왔다(app/(tabs)/index.tsx). 분모를 화면 한 줄이 단독으로 정하고 있어서
   * 서버가 값을 주도록 옮긴다. 4라는 수치 자체는 그 폴백에서 그대로 가져왔다.
   *
   * nullable을 유지하는 이유: 기존 NULL은 "한 번도 정한 적 없음"을 뜻하고
   * 그 구분이 아직 쓸모가 있다. 온보딩이 이 값을 묻지 않아서(onboarding.tsx)
   * NULL인 사용자에게만 나중에 물어보려면 이 신호가 남아 있어야 한다.
   * 편집 UI의 '미설정'은 표시 전용이다 — 값을 비워도 클라이언트가
   * undefined로 보내 키가 누락되므로 한 번 정한 값은 NULL로 되돌아가지 않는다.
   */
  @Column({ nullable: true, default: 4 })
  weeklyGoal: number;

  @Column({ default: false })
  isOnboardingDone: boolean;

  @Column({ default: 50 })
  targetCarbsRatio: number;

  @Column({ default: 30 })
  targetProteinRatio: number;

  @Column({ default: 20 })
  targetFatRatio: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkoutSession, session => session.user)
  workoutSessions: WorkoutSession[];
}
