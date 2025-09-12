import { Module } from '@nestjs/common';
import { PaymentStripeServiceService } from './service/payment-stripe.service';

@Module({
  providers: [PaymentStripeServiceService]
})
export class PaymentStripeModuleModule {}
