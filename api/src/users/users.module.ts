import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { WorkoutSettingsModule } from '../workout-settings/workout-settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), WorkoutSettingsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}