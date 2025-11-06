// src/main.ts - VERSIÓN COMPLETA CORREGIDA
import 'dotenv/config';
import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe, BadRequestException } from '@nestjs/common';
import { envs } from '@/config/envs';
import { HttpExceptionFilter } from './game/scores/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    cors: {
      origin: [
        'https://congresoti.com.mx',
        'https://www.congresoti.com.mx',
        'http://localhost:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization', 
        'X-Requested-With',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
        'Cookie',
        'Set-Cookie',
        'x-skip-refresh',
        'Idempotency-Key',
        'stripe-signature'
      ],
      exposedHeaders: [
        'Set-Cookie',
        'Authorization'
      ]
    }
  });

  app.use('/payment-stripe/webhook', bodyParser.raw({ type: 'application/json' }));
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  // Configuración de proxy para producción
  if (process.env.NODE_ENV === 'production') {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance?.();
    if (instance?.set) {
      instance.set('trust proxy', 1);
    }
  }

  // Middlewares
  app.use(cookieParser());

  // ✅ MIDDLEWARE CORS ADICIONAL PARA MANEJO DE PREFLIGHT
  app.use((req: any, res: any, next: any) => {
    const allowedOrigins = [
      'https://congresoti.com.mx',
      'https://www.congresoti.com.mx',
      'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, X-Requested-With, X-Forwarded-For, X-Forwarded-Proto, Cookie, Set-Cookie, x-skip-refresh'
    );

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // ✅ MIDDLEWARE ESPECÍFICO PARA /auth/refresh
  app.use('/auth/refresh', (req: any, res: any, next: any) => {
    const allowedOrigins = [
      'https://congresoti.com.mx',
      'https://www.congresoti.com.mx',
      'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, X-Requested-With, Cookie, Set-Cookie, x-skip-refresh'
    );

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // Validaciones globales
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      const formatted = errors.map(e => ({
        property: e.property,
        constraints: e.constraints,
      }));
      return new BadRequestException({ errors: formatted, message: 'Datos inválidos' });
    },
  }));

  // Filtro global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('3er Congreso Internacional TI - API')
    .setDescription('API para el 3er Congreso Internacional de Tecnologías de la Información')
    .setVersion('1.0')
    .addTag('auth', 'Autenticación y autorización')
    .addTag('users', 'Gestión de usuarios')
    .addTag('scores', 'Puntajes del juego')
    .addTag('payments', 'Sistema de pagos')
    .addTag('stripe', 'Integración con Stripe')
    .addTag('workshops', 'Gestión de talleres')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth(
      'access_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'Cookie de autenticación JWT'
      },
      'cookie-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
    customSiteTitle: 'API - 3er Congreso TI',
  });

  // Iniciar servidor
  const port = envs.port || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Servidor ejecutándose en: http://localhost:${port}`);
  logger.log(`🌐 CORS configurado para: https://congresoti.com.mx, https://www.congresoti.com.mx, http://localhost:3000`);
  logger.log(`🔐 Modo de autenticación: JWT + Cookies`);
  logger.log(`📚 Documentación API: http://localhost:${port}/api`);
  logger.log(`⚙️  Entorno: ${process.env.NODE_ENV || 'development'}`);
}

process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error durante el bootstrap:', error);
  process.exit(1);
});