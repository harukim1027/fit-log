import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  @Get()
  getAll(@Request() req: any) {
    return this.favoriteService.getAll(req.user.id);
  }

  @Post()
  add(@Request() req: any, @Body() body: any) {
    return this.favoriteService.add(req.user.id, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.favoriteService.remove(req.user.id, id);
  }
}