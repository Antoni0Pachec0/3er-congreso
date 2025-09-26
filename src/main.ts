// src/main.ts
import 'dotenv/config';
import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { envs } from '@/config/envs'; // <-- importa tu archivo envs
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as tsConfigPaths from 'tsconfig-paths';
import { join } from 'path';
import { config } from 'dotenv';
import { PrismaService } from '@prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // necesario para leer raw body en webhooks
    rawBody: true,
  });

  app.use(cookieParser());
  // CORS (ajusta el origin a tu front)
  app.enableCors({
    origin: ['https://congresoti.com.mx/'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'stripe-signature'],
    exposedHeaders: ['Set-Cookie'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  const config = new DocumentBuilder()
    .setTitle('3er Congreso API')
    .setDescription('API para el 3er Congreso - Sistema de pagos y gestión')
    .setVersion('1.0')
    .addTag('payments')
    .addTag('stripe')
    .addTag('users')
    .addTag('auth')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory());
  app.use('/payment-stripe/webhook', bodyParser.raw({ type: '*/*' }));
  await app.listen(envs.port);
  logger.log(`Application is running on: ${envs.port}`);
}
bootstrap();
