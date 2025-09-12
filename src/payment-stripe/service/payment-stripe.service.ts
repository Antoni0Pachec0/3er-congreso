import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';

@Injectable()
export class PaymentStripeServiceService {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.get('payment.stripe.secretKey');
    
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not found');
    }
    
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil', // Latest API version available
    });
  }

  async createCheckoutSession(createCheckoutDto: CreateCheckoutSessionDto) {
    try {
      const domain = this.configService.get('payment.stripe.domain');
      
      const session = await this.stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        line_items: createCheckoutDto.items.map(item => ({
          price: item.price,
          quantity: item.quantity,
        })),
        mode: 'payment',
        return_url: createCheckoutDto.returnUrl || `${domain}/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: createCheckoutDto.cancelUrl,
        success_url: createCheckoutDto.successUrl,
      });

      return {
        clientSecret: session.client_secret,
        id: session.id
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new InternalServerErrorException('Error creating checkout session');
    }
  }

  async getSessionStatus(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        status: session.status,
        customerEmail: session.customer_details?.email,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total
      };
    } catch (error) {
      console.error('Error retrieving session:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new InternalServerErrorException('Error retrieving session');
    }
  }
}
