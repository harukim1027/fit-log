import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkoutService } from './workout.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workout')
@UseGuards(JwtAuthGuard)
export class WorkoutController {
  constructor(private workoutService: WorkoutService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.workoutService.findAll(req.user.id);
  }

  @Get(':date')
  findByDate(@Request() req: any, @Param('date') date: string) {
    return this.workoutService.findByDate(req.user.id, date);
  }

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.workoutService.create(req.user.id, body);
  }
}