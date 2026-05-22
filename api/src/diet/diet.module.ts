import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DietService } from './diet.service';
import { DietController } from './diet.controller';
import { DietLog } from './diet-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DietLog])],
  providers: [DietService],
  controllers: [DietController],
  exports: [DietService],
})
export class DietModule {}