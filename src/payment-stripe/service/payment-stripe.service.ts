import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import paymentConfig from '../../config/payment.config';
import { HttpService } from '@nestjs/axios';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';

@Injectable()
export class PaymentStripeServiceService {
  private stripe: Stripe;

  constructor(
    private readonly paymentConfigService: ConfigService<typeof paymentConfig>,
    private readonly httpService: HttpService,
  ){}

}
