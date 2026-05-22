import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { FoodService } from './food.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('food')
@UseGuards(JwtAuthGuard)
export class FoodController {
  constructor(private foodService: FoodService) {}

  @Get('search')
  search(@Query('q') q: string, @Query('page') page: string) {
    return this.foodService.search(q, parseInt(page) || 1);
  }

  @Get('barcode/:code')
  getByBarcode(@Param('code') code: string) {
    return this.foodService.getByBarcode(code);
  }
}