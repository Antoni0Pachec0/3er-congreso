// src/main.ts
import 'dotenv/config';
import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from '@/config/envs';
import 'tsconfig-paths/register';
import { HttpExceptionFilter } from './game/scores/http-exception.filter';  
import * as tsConfigPaths from 'tsconfig-paths';
import { join } from 'path';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Necesario para leer raw body en webhooks (Stripe)
    rawBody: true,
  });

  // Middlewares
  app.use(cookieParser());

  // Configuración CORS segura (frontend debe coincidir con tu dominio o localhost)
  app.enableCors({
    origin: [envs.frontendUrl || 'https://congresoti.com.mx'],
    credentials: true, // Permite cookies/headers de sesión
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'stripe-signature',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const logger = new Logger('Bootstrap');

  // Swagger (documentación)
  const config = new DocumentBuilder()
    .setTitle('3er Congreso API')
    .setDescription(
      'API para el 3er Congreso - Sistema de pagos y gestión',
    )
    .setVersion('1.0')
    .addTag('payments')
    .addTag('stripe')
    .addTag('users')
    .addTag('auth')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory());

  // Stripe Webhook necesita raw body
  app.use('/payment-stripe/webhook', bodyParser.raw({ type: '*/*' }));

  // Start server
  await app.listen(envs.port || 3001);
  logger.log(`🚀 Application is running on: http://localhost:${envs.port}`);
}

bootstrap();
