import { Controller, Post, Body, Get, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { PaymentStripeServiceService } from '../service/payment-stripe.service';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';

@Controller('payment-stripe')
export class PaymentStripeController {
  constructor(private readonly paymentStripeService: PaymentStripeServiceService) {}

  @Post('create-checkout-session')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(@Body() createCheckoutDto: CreateCheckoutSessionDto) {
    return await this.paymentStripeService.createCheckoutSession(createCheckoutDto);
  }

  @Get('session-status/:sessionId')
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    return await this.paymentStripeService.getSessionStatus(sessionId);
  }
}
