// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '@prisma/prisma.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret', // Cambia esto por tu clave secreta
      signOptions: { expiresIn: '1h' }, // Configura el tiempo de expiración
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, EmailService],
  exports: [JwtModule], // Exporta JwtModule si otros módulos lo necesitan
})
export class AuthModule {}