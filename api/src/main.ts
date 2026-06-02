import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExerciseService } from './exercise/exercise.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });

  const exerciseService = app.get(ExerciseService);
  await exerciseService.seedExercises();

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`서버 실행 중: http://localhost:${port}/api`);
}
bootstrap();
