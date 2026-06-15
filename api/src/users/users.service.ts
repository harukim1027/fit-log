import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(email: string, password: string, name?: string): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('이미 사용 중인 이메일이에요');
    const hashed = await bcrypt.hash(password, 10);
    const user = this.usersRepo.create({ email, password: hashed, name });
    return this.usersRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
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
    return this.usersRepo.save(newUser);
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