// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

import { RolesGuard } from '@/common/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, AttendanceController],
  providers: [AdminService, AttendanceService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
