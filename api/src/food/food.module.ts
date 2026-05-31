import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodService } from './food.service';
import { FoodController } from './food.controller';
import { CustomFood } from './custom_food.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFood])],
  providers: [FoodService],
  controllers: [FoodController],
})
export class FoodModule {}
