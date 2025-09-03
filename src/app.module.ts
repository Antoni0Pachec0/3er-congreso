import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PaymentModule } from './payment/payment.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [AuthModule, UserModule, PaymentModule, ScheduleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
