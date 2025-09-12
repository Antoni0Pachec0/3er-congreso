import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PaymentCardModule } from './payment/payment-card.module';
import { PaymentStripeController } from './payment-stripe/controller/payment-stripe/payment-stripe.controller';
import { PaymentStripeModuleModule } from './payment-stripe/payment-stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule, 
    UserModule, 
    ScheduleModule, 
    PaymentCardModule, PaymentStripeModuleModule
  ],
  controllers: [AppController, PaymentStripeController],
  providers: [AppService],
})
export class AppModule {}
