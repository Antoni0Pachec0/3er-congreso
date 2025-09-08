import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { UserModule } from './user/user.module';
import { PaymentModule } from './payment/payment.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [AuthModule, PaymentsModule, UserModule, PaymentModule, ScheduleModule],
=======
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PaymentCardModule } from './payment/payment-card.module';

@Module({
  imports: [AuthModule, UserModule, PaymentModule, ScheduleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
