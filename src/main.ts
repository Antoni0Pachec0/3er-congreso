import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { envs } from '@/config/envs'; // <-- importa tu archivo envs
import 'tsconfig-paths/register';
import * as bodyParser from 'body-parser';
import * as tsConfigPaths from 'tsconfig-paths';
import { join } from 'path';
import { config } from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // necesario para leer raw body en webhooks
    rawBody: true,
  });

  // CORS (ajusta el origin a tu front)
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'stripe-signature'],
  });


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
