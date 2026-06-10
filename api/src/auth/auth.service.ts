/**
 * @file auth/auth.service.ts
 * @description 인증 비즈니스 로직 (JWT 발급, Google OAuth 검증)
 *
 * JWT 페이로드 구조: { sub: userId, email }
 * - sub는 JWT 표준 클레임(Subject) — 사용자 식별자로 userId를 사용
 * - Guard에서 이 페이로드를 꺼내 req.user에 주입 (JwtStrategy 참조)
 *
 * Google OAuth 흐름 (서버 사이드 검증):
 * 1. 클라이언트가 Expo AuthSession으로 Google accessToken 취득
 * 2. accessToken을 이 서버로 전달
 * 3. 서버가 Google userinfo 엔드포인트로 검증 → 실제 Google 사용자인지 확인
 * 4. 검증 성공 시 앱 JWT 발급
 *
 * 클라이언트에서 직접 Google 응답을 신뢰하지 않는 이유:
 * 중간자가 임의의 프로필을 주입할 수 있다. 서버가 Google에 직접 확인해야 안전하다.
 */

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
    // usersService.create 내부에서 bcrypt 해싱 처리 — 여기선 평문 전달
    const user = await this.usersService.create(email, password, name);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않아요');
    // 소셜 로그인으로 가입한 계정은 password가 null — 이메일 로그인 불가
    if (!user.password) throw new UnauthorizedException('소셜 로그인으로 가입된 계정이에요');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않아요');
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  /**
   * 만료된 accessToken을 새 토큰으로 교체한다.
   * RefreshGuard를 통과한 요청만 여기 도달하므로 user 검증은 불필요.
   * (현재는 refreshToken 재발급 없이 accessToken만 갱신하는 단순 구조)
   */
  async refreshToken(user: { id: number; email: string }) {
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token };
  }

  /**
   * Google accessToken을 받아 Google userinfo API로 검증하고 앱 JWT를 발급한다.
   *
   * findOrCreateSocialUser: 이메일이 이미 있으면 기존 계정과 Google 계정을 연결하고,
   * 없으면 새 계정을 생성한다. 동일 이메일로 이메일/소셜 중복 가입을 방지하는 로직.
   *
   * profile.sub: Google의 사용자 고유 식별자 — 이메일이 바뀌어도 동일 계정 추적 가능.
   */
  async loginWithGoogle(accessToken: string) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('유효하지 않은 Google 토큰이에요');
    }
    const profile = (await res.json()) as { sub: string; email: string; name: string };

    const user = await this.usersService.findOrCreateSocialUser(
      profile.email,
      // Google 계정에 이름이 없는 경우 이메일 앞부분을 기본값으로 사용
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
        // 온보딩 완료 여부를 클라이언트에 전달해 첫 로그인 시 온보딩 화면으로 라우팅
        isOnboardingDone: user.isOnboardingDone,
      },
    };
  }
}
