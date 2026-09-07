import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}