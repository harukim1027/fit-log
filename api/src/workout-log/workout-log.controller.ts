import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkoutLogService } from './workout-log.service';
import { ParseWorkoutDto } from './dto/parse-workout.dto';
import { UndoLogDto } from './dto/undo-log.dto';
import { AddExercisesDto } from './dto/add-exercises.dto';

@Controller('workout-logs')
@UseGuards(JwtAuthGuard)
export class WorkoutLogController {
  constructor(private readonly service: WorkoutLogService) {}

  // 파싱만 (확인 화면 흐름)
  @Post('parse')
  parse(@Request() req: any, @Body() body: ParseWorkoutDto) {
    return this.service.logFromText(req.user.id, body.text);
  }

  // 빠른 기록: 파싱 → 오늘 세션에 즉시 저장
  @Post('quick')
  quick(@Request() req: any, @Body() body: ParseWorkoutDto) {
    return this.service.quickLog(req.user.id, body.text);
  }

  // 수동 입력: picker로 고른 이름+카테고리 종목을 추가 (코어 공유, source 'manual')
  // sessionId 있으면 그 세션에 누적, 없으면 오늘 세션 get-or-create.
  @Post('manual')
  addManual(@Request() req: any, @Body() body: AddExercisesDto) {
    return this.service.addManual(req.user.id, body.exercises, body.sessionId);
  }

  // 되돌리기: 방금 저장한 종목 삭제
  @Post('undo')
  undo(@Request() req: any, @Body() body: UndoLogDto) {
    return this.service.undo(req.user.id, body.ids);
  }
}
