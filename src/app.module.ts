// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthService } from '@auth/auth.service';
import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { ScheduleModule } from '@/schedule/schedule.module';
import { PaymentCardModule } from '@/payment/payment-card.module';
import { PrismaModule } from '@prisma/prisma.module';
import { ScoresModule } from './game/scores/scores.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    UserModule, 
    ScheduleModule, 
    PaymentCardModule,
    ScoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}