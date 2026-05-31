import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Request, UseGuards } from '@nestjs/common';
import { FoodService } from './food.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('food')
@UseGuards(JwtAuthGuard)
export class FoodController {
  constructor(private foodService: FoodService) {}

  @Get('search')
  search(@Request() req: any, @Query('q') q: string, @Query('page') page: string) {
    return this.foodService.search(q, parseInt(page) || 1, req.user.id);
  }

  @Get('barcode/:code')
  getByBarcode(@Param('code') code: string) {
    return this.foodService.getByBarcode(code);
  }

  @Post('analyze-image')
  analyzeImage(@Body() body: { base64: string }) {
    return this.foodService.analyzeImage(body.base64);
  }

  @Post('custom')
  createCustomFood(@Request() req: any, @Body() body: any) {
    return this.foodService.createCustomFood(req.user.id, body);
  }

  @Get('custom')
  getMyCustomFoods(@Request() req: any) {
    return this.foodService.getMyCustomFoods(req.user.id);
  }

  @Patch('custom/:id')
  updateCustomFood(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.foodService.updateCustomFood(req.user.id, id, body);
  }

  @Delete('custom/:id')
  deleteCustomFood(@Request() req: any, @Param('id') id: string) {
    return this.foodService.deleteCustomFood(req.user.id, id);
  }

  @Post('custom/:id/copy')
  copyCustomFood(@Request() req: any, @Param('id') id: string) {
    return this.foodService.copyCustomFood(req.user.id, id);
  }
}
