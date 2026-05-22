import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';
import { Favorite } from './favorite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite])],
  providers: [FavoriteService],
  controllers: [FavoriteController],
  exports: [FavoriteService],
})
export class FavoriteModule {}