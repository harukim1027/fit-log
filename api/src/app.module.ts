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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 회귀 방지: synchronize 를 다시 true 로 되돌리지 말 것.
    //
    // true 면 앱이 뜰 때마다 엔티티와 실제 스키마를 비교해 자동으로 맞춘다.
    // 컬럼 이름을 바꾸면 TypeORM 은 "이름이 바뀌었다"를 모르고 옛 컬럼을 DROP,
    // 새 컬럼을 CREATE 한다 — 사이에 데이터를 옮기는 단계가 없고 되돌릴 이력도
    // 없다. Railway 가 push 마다 자동 배포하므로 엔티티를 고쳐 push 하는 것만으로
    // 운영 스키마가 바뀐다. 자세한 내용은 저장소 루트 DEPLOY-BLOCKERS.md 항목 1.
    //
    // 스키마 변경은 마이그레이션으로만 한다:
    //   npm run migration:generate -- src/migrations/<이름>
    //   npm run build && npm run migration:run
    // CLI 가 보는 접속 설정은 src/data-source.ts 에 있고 아래와 같아야 한다.
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: false,
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'fitlog',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: false,
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
  ],
})
export class AppModule {}
