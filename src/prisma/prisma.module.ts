// src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Global() // Opcional: hace que PrismaService esté disponible globalmente
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Esto es crucial
})
export class PrismaModule {}