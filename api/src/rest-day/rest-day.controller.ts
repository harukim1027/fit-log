import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RestDayService } from './rest-day.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rest-days')
@UseGuards(JwtAuthGuard)
export class RestDayController {
  constructor(private restDayService: RestDayService) {}

  /** GET /api/rest-days — 내 쉬는날 목록 */
  @Get()
  list(@Request() req: any) {
    return this.restDayService
      .getRestDays(req.user.id)
      .then((dates) => ({ dates }));
  }

  /** POST /api/rest-days { date } — 쉬는날 지정 */
  @Post()
  add(@Request() req: any, @Body() body: { date: string }) {
    return this.restDayService
      .addRestDay(req.user.id, body.date)
      .then((dates) => ({ dates }));
  }

  /** DELETE /api/rest-days/:date — 쉬는날 해제 */
  @Delete(':date')
  remove(@Request() req: any, @Param('date') date: string) {
    return this.restDayService
      .removeRestDay(req.user.id, date)
      .then((dates) => ({ dates }));
  }
}
