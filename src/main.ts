// src/main.ts
import 'dotenv/config';
import 'tsconfig-paths/register';

import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { envs } from '@/config/envs';
import { PrismaService } from '@prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('3er Congreso API').setDescription('API para el 3er Congreso')
    .setVersion('1.0').addTag('auth').addTag('users').addTag('payments').addTag('stripe')
    .addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  const port = Number(envs.port) || 3001;
  await app.listen(port);
  logger.log(`Application is running on: ${port}`);
  logger.log(`CORS enabled for: http://localhost:3000`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api`);
}
bootstrap();
