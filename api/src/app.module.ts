import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { RoutineModule } from './routine/routine.module';
import { RestDayModule } from './rest-day/rest-day.module';
import { WorkoutLogModule } from './workout-log/workout-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'fitlog',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          },
    ),
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
    RoutineModule,
    RestDayModule,
    WorkoutLogModule,
  ],
})
export class AppModule {}
