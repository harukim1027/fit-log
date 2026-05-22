import { Controller, Get, Post, Delete, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WaterService } from './water.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('water')
@UseGuards(JwtAuthGuard)
export class WaterController {
  constructor(private waterService: WaterService) {}

  @Get()
  getTotal(@Request() req: any, @Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.waterService.getTotal(req.user.id, d).then(total => ({ total, date: d }));
  }

  @Post()
  add(@Request() req: any, @Body() body: { date?: string; amount: number }) {
    const d = body.date || new Date().toISOString().split('T')[0];
    return this.waterService.add(req.user.id, d, body.amount).then(total => ({ total, date: d }));
  }

  @Delete()
  reset(@Request() req: any, @Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.waterService.reset(req.user.id, d);
  }
}