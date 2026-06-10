import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const user = await this.usersService.create(email, password, name);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않아요');
    if (!user.password) throw new UnauthorizedException('소셜 로그인으로 가입된 계정이에요');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않아요');
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async refreshToken(user: { id: number; email: string }) {
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token };
  }

  async loginWithGoogle(accessToken: string) {
    // Verify token and fetch profile via Google's userinfo endpoint.
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('유효하지 않은 Google 토큰이에요');
    }
    const profile = (await res.json()) as { sub: string; email: string; name: string };

    const user = await this.usersService.findOrCreateSocialUser(
      profile.email,
      profile.name ?? profile.email.split('@')[0],
      'google',
      profile.sub,
    );

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isOnboardingDone: user.isOnboardingDone,
      },
    };
  }
}
