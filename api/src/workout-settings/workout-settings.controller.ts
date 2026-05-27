import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { WorkoutSettingsService } from './workout-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workout-settings')
@UseGuards(JwtAuthGuard)
export class WorkoutSettingsController {
  constructor(private service: WorkoutSettingsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body('name') name: string) {
    return this.service.create(req.user.id, name);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
