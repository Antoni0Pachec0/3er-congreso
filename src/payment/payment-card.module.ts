import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentCardService } from './services/payment-card.service';
import { PaymentCardController } from './controller/payment-card.controller';
import paymentConfig from '../config/payment.config';

@Module({
  imports: [
    ConfigModule.forFeature(paymentConfig)
  ],
  providers: [PaymentCardService],
  controllers: [PaymentCardController]
})
export class PaymentCardModule {}
