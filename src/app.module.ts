import { Module } from '@nestjs/common';
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
import { PaymentModule } from './payment/payment.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [AuthModule, UserModule, PaymentModule, ScheduleModule],
>>>>>>> asp
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
