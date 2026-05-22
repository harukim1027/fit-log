import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DietService } from './diet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('diet')
@UseGuards(JwtAuthGuard)
export class DietController {
  constructor(private dietService: DietService) {}

  @Get()
  getByDate(@Request() req: any, @Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.dietService.getByDate(req.user.id, d);
  }

  @Post()
  addFood(@Request() req: any, @Body() body: any) {
    return this.dietService.addFood(req.user.id, body);
  }

  @Delete(':id')
  deleteFood(@Request() req: any, @Param('id') id: string) {
    return this.dietService.deleteFood(req.user.id, id);
  }

  @Get('calories')
  getTotalCalories(@Request() req: any, @Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.dietService.getTotalCalories(req.user.id, d);
  }
}