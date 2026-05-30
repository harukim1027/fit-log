import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Routine } from './routine.entity';
import { RoutineService } from './routine.service';
import { RoutineController } from './routine.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Routine])],
  providers: [RoutineService],
  controllers: [RoutineController],
})
export class RoutineModule {}
