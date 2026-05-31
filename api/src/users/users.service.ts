import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
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

  async updateProfile(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data);
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('유저를 찾을 수 없어요');
    return user;
  }
}