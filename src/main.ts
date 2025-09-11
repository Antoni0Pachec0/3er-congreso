import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from '@/config/envs'; // <-- importa tu archivo envs
import 'tsconfig-paths/register';
import * as tsConfigPaths from 'tsconfig-paths';
import { join } from 'path';
import { config } from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(envs.port);
  logger.log(`Application is running on: ${envs.port}`);
}
bootstrap();
