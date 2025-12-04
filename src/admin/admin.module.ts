import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [AdminController, FinanceController],
  providers: [AdminService, FinanceService, PrismaService],
})
export class AdminModule {}
