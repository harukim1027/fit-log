import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
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

  // 수동 입력: 카탈로그 picker 기반 종목을 세션에 추가 (코어 공유, source 'manual')
  @Post('sessions/:id/exercises')
  addManual(
    @Request() req: any,
    @Param('id') sessionId: string,
    @Body() body: AddExercisesDto,
  ) {
    return this.service.addManual(req.user.id, sessionId, body.exercises);
  }

  // 되돌리기: 방금 저장한 종목 삭제
  @Post('undo')
  undo(@Request() req: any, @Body() body: UndoLogDto) {
    return this.service.undo(req.user.id, body.ids);
  }
}
