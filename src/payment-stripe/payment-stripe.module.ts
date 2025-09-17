import { Module } from '@nestjs/common';
import { PaymentStripeService } from './service/payment-stripe.service';
import { PaymentStripeController } from './controller/payment-stripe.controller';
import { ConfigModule } from '@nestjs/config';
import paymentConfig from '../config/payment.config';

@Module({
  imports: [ConfigModule.forFeature(paymentConfig)],
  providers: [PaymentStripeService],
  controllers: [PaymentStripeController]
})
export class PaymentStripeModule {}
