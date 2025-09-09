// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from '@/auth/auth.service';
import { AuthController } from '@/auth/auth.controller';
import { PrismaModule } from '@prisma/prisma.module'; // Importa el módulo, no el servicio

@Module({
  imports: [PrismaModule], // Importa el módulo de Prisma
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}