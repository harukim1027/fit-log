import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * 없는 계정이면 404 를 던진다. `findById` 는 `User | null` 이고, null 을 그대로
   * 돌려주면 Nest 가 **200 + 0바이트 본문**을 내보낸다. 탈퇴 기능이 생기기
   * 전에는 도달할 수 없는 경로였지만, 이제 다른 기기에 남은 토큰이 실제로
   * 이 상태를 만든다.
   *
   * 200 을 그대로 두면 클라이언트가 조용히 망가진다. authStore.loadToken 은
   * 응답을 `saveUser(res.data)` 로 캐시에 쓰는데, 빈 본문은 axios 에서 `""` 라
   * AsyncStorage 에 `\"\"` 가 저장된다. **다음 실행에서 user 가 `""` 로 복원되고
   * token 은 살아 있어** 로그인 화면으로도 못 가는 상태가 된다.
   *
   * 예외와 메시지는 deleteAccount 와 같은 것을 쓴다.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException('유저를 찾을 수 없어요');
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req: any, @Body() body: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  /**
   * 계정 탈퇴. **되돌릴 수 없다.**
   *
   * 대상 id 를 파라미터로 받지 않는다. `req.user.id` 는 JwtAuthGuard 가 검증한
   * 토큰의 sub 이므로 **자기 자신만 지울 수 있다.** 경로에 id 를 열면 남의
   * 계정을 지우려는 시도를 막을 책임이 생긴다 — 아예 받지 않는 편이 안전하다.
   *
   * 비밀번호 재확인은 두지 않는다. 소셜 로그인 계정은 password 가 null 이라
   * (auth.service 의 "소셜 로그인으로 가입된 계정이에요") 재확인을 요구하면
   * **그 사용자들은 탈퇴할 수 없다.** 이메일 가입자에게만 요구하면 경로마다
   * 다른 규칙이 생긴다. 실수 방지는 클라이언트의 2단계 확인이 맡는다.
   *
   * 204 를 쓰는 이유: 지워진 자원에 대해 돌려줄 표현이 없다.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Request() req: any): Promise<void> {
    await this.usersService.deleteAccount(req.user.id);
  }
}