import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();

  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN;
  const corsConfig = corsOrigin
    ? { origin: corsOrigin.split(',').map((value) => value.trim()) }
    : { origin: true };

  app.enableCors(corsConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT || '5000');
  await app.listen(Number.isFinite(port) ? port : 5000);
}
bootstrap();
