import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoachService } from './coach.service';

@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachController {
  constructor(private readonly service: CoachService) {}

  // 오늘의 코치 인사이트 (캐시 우선, 캐시 미스만 LLM 호출)
  @Get('today')
  today(@Request() req: any) {
    return this.service.getTodayInsight(req.user.id);
  }
}
