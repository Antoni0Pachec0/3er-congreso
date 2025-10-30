// src/main.ts
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
    cors: false, // Configuramos CORS manualmente
  });

  app.use('/payment-stripe/webhook', bodyParser.raw({ type: 'application/json' }));
    // Body parsers
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

  // 🔥 CORS CONFIGURACIÓN COMPLETA Y CORREGIDA
  const FRONT_ORIGINS = [
    'http://localhost:3000',
    //'http://127.0.0.1:3000',
    envs.frontendUrl || 'http://localhost:3000',
    'http://localhost:3000',
  ].filter(Boolean);

  const uniqueOrigins = [...new Set(FRONT_ORIGINS)];

  const logger = new Logger('Bootstrap');
  logger.log(`🌐 Configurando CORS para orígenes: ${uniqueOrigins.join(', ')}`);

  // 🔥 CONFIGURACIÓN CORS PRINCIPAL
  app.enableCors({
    origin: [envs.frontendUrl || 'http://localhost:3000'],
    credentials: true, // Permite cookies/headers de sesión
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Forwarded-For',
      'X-Forwarded-Proto',
      'Cookie',
      'Set-Cookie',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Origin', 
      'Access-Control-Allow-Credentials',
      'Idempotency-Key',
      'stripe-signature',
      'Accept',
      'Accept-Language',
      'Content-Language',
      'Origin',
      'Referer',
      // 🔥 NUEVOS HEADERS PERMITIDOS
      'X-Origin',
      'X-Debug-Mode',
      'User-Agent'
    ],
    exposedHeaders: [
      'Set-Cookie',
      'Cookie',
      'Authorization',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400
  });

  // 🔥 MIDDLEWARE PARA MANEJO DE PREFLIGHT
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      res.header('Access-Control-Allow-Headers', 
        'Content-Type, Authorization, X-Requested-With, X-Forwarded-For, X-Forwarded-Proto, Cookie, Set-Cookie, X-Origin, X-Debug-Mode'
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      return res.status(204).send();
    }
    
    // Para requests normales
    if (origin && uniqueOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
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

  logger.log(` Servidor ejecutándose en: http://localhost:${port}`);
  logger.log(`CORS configurado para ${uniqueOrigins.length} orígenes`);
  logger.log(`Modo de autenticación: JWT + Cookies`);
  logger.log(` Documentación API: http://localhost:${port}/api`);
  logger.log(` Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.log(`\n💡 TIPS PARA DESARROLLO:`);
    logger.log(`   • Headers permitidos: X-Origin, X-Debug-Mode, etc.`);
    logger.log(`   • CORS configurado para desarrollo local`);
  }
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