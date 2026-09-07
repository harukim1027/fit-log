import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { WorkoutSettingsService } from '../workout-settings/workout-settings.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private workoutSettings: WorkoutSettingsService,
    private dataSource: DataSource,
  ) {}

  async create(email: string, password: string, name?: string): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('이미 사용 중인 이메일이에요');
    const hashed = await bcrypt.hash(password, 10);
    const user = this.usersRepo.create({ email, password: hashed, name });
    const saved = await this.usersRepo.save(user);
    // 기구 설정 기본 항목을 깔아 준다. 실패해도 가입은 성공시킨다 —
    // 사용자가 "기본 항목 되돌리기"로 스스로 복구할 수 있다.
    await this.workoutSettings.seedDefaults(saved.id);
    return saved;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  /**
   * 이메일 로그인 전용. **password 해시를 함께 가져오는 유일한 경로다.**
   *
   * User.password 는 `select: false` 라 일반 조회에 안 딸려온다. 여기서만
   * `addSelect` 로 되살린다. 반환값을 그대로 응답에 실으면 해시가 다시
   * 새어 나가므로, auth.service 처럼 필요한 필드만 골라 담아 내보낼 것.
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findOrCreateSocialUser(
    email: string,
    name: string,
    provider: string,
    providerId: string,
  ): Promise<User> {
    // Check by provider + providerId first (returning social user).
    let user = await this.usersRepo.findOne({ where: { provider, providerId } });
    if (user) return user;

    // Same email already exists → link social account to existing user.
    user = await this.usersRepo.findOne({ where: { email } });
    if (user) {
      await this.usersRepo.update(user.id, { provider, providerId });
      return (await this.findById(user.id))!;
    }

    // Brand-new social sign-up (no password).
    const newUser = this.usersRepo.create({ email, name, provider, providerId });
    const savedNew = await this.usersRepo.save(newUser);
    await this.workoutSettings.seedDefaults(savedNew.id);
    return savedNew;
  }

  async updateProfile(id: string, data: UpdateUserDto): Promise<User> {
    console.log('[updateProfile] id:', id, 'data:', JSON.stringify(data));
    try {
      // update() 대신 findOne + Object.assign + save:
      // - PK/relation 키가 섞여 들어가도 안전하고, 엔티티 타입 변환을 거친다.
      const user = await this.findById(id);
      if (!user) throw new NotFoundException('유저를 찾을 수 없어요');
      Object.assign(user, data);
      const saved = await this.usersRepo.save(user);
      console.log('[updateProfile] saved:', saved.id);
      return saved;
    } catch (error: any) {
      // Railway/Sentry에서 정확한 원인(컬럼/타입 등)을 확인할 수 있게 로깅
      console.error('[updateProfile] FAILED:', error?.message, error?.stack);
      throw error;
    }
  }

  /**
   * 계정과 그에 딸린 데이터를 **전부, 되돌릴 수 없게** 삭제한다.
   *
   * ── 어디까지 지워지나 ───────────────────────────────────────────────────
   * users 를 참조하는 8개 테이블은 FK 가 ON DELETE CASCADE 라 users 행 하나를
   * 지우면 따라온다(AddCascadeOnUserDelete 마이그레이션).
   * workout_sessions → workout_exercises → workout_sets 도 그 아래로 연쇄된다.
   *
   * **exercises 만 예외라 손으로 지운다.** 그 테이블의 userId 는
   * character varying 이고 users.id 는 uuid 라 FK 가 아예 걸려 있지 않다.
   * 빠뜨리면 조회되지 않는 커스텀 종목이 영구히 남는다 — 리허설에서 실제로
   * 고아 2행이 남는 것을 확인했다.
   *
   * ── 왜 트랜잭션인가 ─────────────────────────────────────────────────────
   * exercises 삭제와 users 삭제가 따로 놀면, 중간에 실패했을 때 종목만
   * 사라지고 계정은 남는 상태가 된다. 사용자에게는 "탈퇴 실패"인데 데이터는
   * 이미 일부 없어진 상태다.
   *
   * ── 로그 ────────────────────────────────────────────────────────────────
   * 되돌릴 수 없는 동작이라 무엇을 지웠는지 남긴다. 사고가 나면 이 로그가
   * 유일한 단서다. 이메일은 남기지 않는다 — 지워진 계정의 식별자를 로그에
   * 붙들어 두는 것이라 삭제 요청의 취지에 어긋난다. id 로 충분하다.
   */
  async deleteAccount(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('유저를 찾을 수 없어요');

    await this.dataSource.transaction(async (manager) => {
      // FK 가 없어 CASCADE 가 걸리지 않는다. users 삭제보다 먼저 지운다.
      const exercises = await manager.query(
        'DELETE FROM exercises WHERE "userId" = $1',
        [id],
      );
      const deletedExercises = Array.isArray(exercises) ? exercises[1] : 0;

      await manager.delete(User, { id });

      console.log(
        `[deleteAccount] userId=${id} customExercises=${deletedExercises}`,
      );
    });
  }
}