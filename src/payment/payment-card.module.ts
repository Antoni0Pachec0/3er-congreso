import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentCardService } from './services/payment-card.service';
import { PaymentCardController } from './controller/payment-card.controller';
import paymentConfig from '../config/payment.config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(paymentConfig)
  ],
  providers: [PaymentCardService],
  controllers: [PaymentCardController]
})
export class PaymentCardModule {}
