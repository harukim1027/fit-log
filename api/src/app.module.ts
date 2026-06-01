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
import { RoutineModule } from './routine/routine.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          };
        }
        return {
          type: 'postgres',
          host: config.get('DB_HOST') || 'localhost',
          port: config.get('DB_PORT') || 5432,
          username: config.get('DB_USERNAME') || 'postgres',
          password: config.get('DB_PASSWORD') || 'postgres',
          database: config.get('DB_NAME') || 'fitlog',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        };
      },
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
    RoutineModule,
  ],
})
export class AppModule {}
