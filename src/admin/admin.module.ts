// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PrismaModule } from '@prisma/prisma.module'; // 👈 importa el módulo

@Module({
  imports: [PrismaModule],                 // 👈 agrega PrismaModule
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],   // 👈 quita PrismaService
  exports: [AdminService],
})
export class AdminModule {}
