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

  if (process.env.NODE_ENV === 'production') {
    // ✅ forma segura para cualquier adaptador (Express/Fastify):
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance?.();
    if (instance?.set) {
      instance.set('trust proxy', 1);
    }
  }

  // Middlewares
  app.use(cookieParser());

  // CORS (usa exactamente tu FRONTEND_URL validada)
  const FRONT_ORIGINS = [envs.frontendUrl || 'http://localhost:3000'];

  app.enableCors({
    origin: FRONT_ORIGINS,
    credentials: true, // Permite cookies/headers de sesión
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'stripe-signature',
      'X-Requested-With',
    ],
  });

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Filtro global (ya lo tenías importado)
  app.useGlobalFilters(new HttpExceptionFilter());

  const logger = new Logger('Bootstrap');

  // Swagger (documentación)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('3er Congreso API')
    .setDescription('API para el 3er Congreso - Sistema de pagos y gestión')
    .setVersion('1.0')
    .addTag('payments')
    .addTag('stripe')
    .addTag('users')
    .addTag('auth')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory());

  // Stripe Webhook necesita raw body SOLO en esta ruta
  app.use('/payment-stripe/webhook', bodyParser.raw({ type: '*/*' }));

  // Start server
  const port = envs.port || 3001;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌐 CORS origin(s): ${FRONT_ORIGINS.join(', ')}`);
  logger.log(`🏷️  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
