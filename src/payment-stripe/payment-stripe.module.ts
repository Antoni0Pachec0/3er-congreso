import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentStripeServiceService } from './service/payment-stripe.service';
import { PaymentStripeController } from './controller/payment-stripe.controller';

@Module({
  imports: [ConfigModule],
  providers: [PaymentStripeServiceService],
  controllers: [PaymentStripeController],
  exports: [PaymentStripeServiceService]
})
export class PaymentStripeModuleModule {}
