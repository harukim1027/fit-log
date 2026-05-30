import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('exercise')
@UseGuards(JwtAuthGuard)
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get('search')
  search(@Query('q') q: string, @Query('limit') limit: string, @Request() req: any) {
    return this.exerciseService.search(q || '', req.user?.id, parseInt(limit) || 20);
  }

  @Get('bodypart')
  getByBodyPart(@Query('part') part: string, @Query('limit') limit: string) {
    return this.exerciseService.findByBodyPart(part || '', parseInt(limit) || 20);
  }

  @Get('list')
  getList(@Query('page') page: string, @Query('limit') limit: string) {
    return this.exerciseService.findAll(parseInt(page) || 1, parseInt(limit) || 20);
  }

  @Post('custom')
  createCustom(@Body() body: any, @Request() req: any) {
    return this.exerciseService.createCustomExercise(req.user.id, {
      name: body.name,
      category: body.category,
      nameKo: body.nameKo,
    });
  }
}
