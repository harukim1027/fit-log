import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { RoutineService } from './routine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('routine')
@UseGuards(JwtAuthGuard)
export class RoutineController {
  constructor(private routineService: RoutineService) {}

  @Get('explore')
  explore(@Query('sort') sort: string) {
    return this.routineService.explore(sort === 'popular' ? 'popular' : 'latest');
  }

  @Get('code/:shareCode')
  findByCode(@Param('shareCode') shareCode: string) {
    return this.routineService.findByCode(shareCode);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.routineService.findAll(req.user.id);
  }

  @Post('combine')
  combine(@Request() req: any, @Body() body: any) {
    return this.routineService.combine(req.user.id, body);
  }

  @Patch('reorder')
  reorder(@Request() req: any, @Body() body: { ids: string[] }) {
    return this.routineService.reorderRoutines(req.user.id, body.ids);
  }

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.routineService.create(req.user.id, body);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.routineService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.routineService.remove(id, req.user.id);
  }

  @Post(':id/share')
  share(@Request() req: any, @Param('id') id: string) {
    return this.routineService.share(id, req.user.id);
  }

  @Delete(':id/share')
  unshare(@Request() req: any, @Param('id') id: string) {
    return this.routineService.unshare(id, req.user.id);
  }

  @Post(':id/copy')
  copy(@Request() req: any, @Param('id') id: string) {
    return this.routineService.copy(id, req.user.id);
  }
}
