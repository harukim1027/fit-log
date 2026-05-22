import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaterService } from './water.service';
import { WaterController } from './water.controller';
import { WaterLog } from './water-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WaterLog])],
  providers: [WaterService],
  controllers: [WaterController],
})
export class WaterModule {}