import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FoodModule } from './food/food.module';
import { WorkoutModule } from './workout/workout.module';
import { StatsModule } from './stats/stats.module';
import { DietModule } from './diet/diet.module';
import { FavoriteModule } from './favorite/favorite.module';
import { WaterModule } from './water/water.module';
import { WorkoutSettingsModule } from './workout-settings/workout-settings.module';
import { ExerciseModule } from './exercise/exercise.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    FoodModule,
    WorkoutModule,
    StatsModule,
    DietModule,
    FavoriteModule,
    WaterModule,
    WorkoutSettingsModule,
    ExerciseModule,
  ],
})
export class AppModule {}
