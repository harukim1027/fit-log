import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestDayService } from './rest-day.service';
import { RestDayController } from './rest-day.controller';
import { RestDay } from './rest-day.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RestDay])],
  providers: [RestDayService],
  controllers: [RestDayController],
})
export class RestDayModule {}
