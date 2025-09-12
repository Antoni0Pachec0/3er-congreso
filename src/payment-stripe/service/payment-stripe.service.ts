import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import paymentConfig from '../../config/payment.config';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';
import { PaymentStripeController } from '../controller/payment-stripe.controller';


@Injectable()
export class PaymentStripeServiceService {
  private stripe: Stripe;

  constructor(
    private readonly config: ConfigService<typeof paymentConfig>,
  ){
    const secret= this.config.get('stripe.secretKey',{infer:true})!;
    this.stripe = new Stripe(secret, {
      apiVersion: '2024-06-20',
    });
  }
  async createEmbeddedCheckoutSession(body: CreateCheckoutSessionDto){
    try {
      
    } catch (error) {
      
    }
  }

}
