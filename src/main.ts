import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { envs } from '@/config/envs';
import 'tsconfig-paths/register';
import * as tsConfigPaths from 'tsconfig-paths';
import { join } from 'path';
import { config } from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // 🔥 CONFIGURACIÓN COMPLETA DE CORS - ESTO ES LO QUE FALTABA
  app.enableCors({
    origin: 'http://localhost:3000', // URL exacta de tu frontend Nuxt
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
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
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(envs.port);
  logger.log(`Application is running on: ${envs.port}`);
  logger.log(`CORS enabled for: http://localhost:3000`);
  logger.log(`Swagger documentation available at: http://localhost:${envs.port}/api`);
}

bootstrap();