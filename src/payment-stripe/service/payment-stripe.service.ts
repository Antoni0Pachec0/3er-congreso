import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentConfigService } from '../../config/payment.config';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';
import { VerifyPaymentResponseDto } from '../dto/verify-payment-response.dto';

@Injectable()
export class PaymentStripeService {
  private readonly logger = new Logger(PaymentStripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly paymentConfigService: PaymentConfigService) {
    const sk = this.paymentConfigService.stripe.secretKey;
    if (!sk) {
      throw new Error('STRIPE_SECRET_KEY no está configurada');
    }
    this.stripe = new Stripe(sk, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }

  /**
   * Crea una sesión de Stripe Checkout en modo EMBEDDED y regresa el client_secret
   */
  async createEmbeddedCheckoutSession(
    body: CreateCheckoutSessionDto,
  ): Promise<{ sessionId: string; clientSecret: string | null }> {
    try {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        throw new BadRequestException('items requerido y no puede estar vacío');
      }

      const lineItems = body.items.map((item) => {
        const priceId = this.getPriceId(item.price);
        if (!priceId) {
          throw new BadRequestException(`Precio no definido: ${item.price}`);
        }
        if (!item.quantity || item.quantity < 1) {
          throw new BadRequestException('quantity debe ser >= 1');
        }
        return { price: priceId, quantity: item.quantity };
      });

      const returnUrl =
        body.returnUrl ||
        `${this.paymentConfigService.stripe.appDomain}/payment/return?session_id={CHECKOUT_SESSION_ID}`;

      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        ui_mode: 'embedded',
        line_items: lineItems,
        return_url: returnUrl,
        customer_email: body.customerEmail,
        client_reference_id: body.clientReferenceId,
        metadata: body.metadata || {},
      });

      return {
        sessionId: session.id,
        clientSecret: session.client_secret ?? null,
      };
    } catch (error: any) {
      this.logger.error('Error al crear sesión embedded', error?.stack || error);
      if (error?.type === 'StripeInvalidRequestError') {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        error?.message || 'Error al crear la sesión de Stripe',
      );
    }
  }

  /**
   * Recupera detalles de la sesión (útil para depurar o pantallas de admin)
   */
  async getCheckoutSessionDetails(sessionId: string) {
    if (!sessionId) throw new BadRequestException('sessionId requerido');
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'customer'],
      });
    } catch (error: any) {
      this.logger.error('Error al obtener detalles de la sesión', error?.stack || error);
      throw new BadRequestException(error?.message || 'No se pudo recuperar la sesión');
    }
  }

  /**
   * Verifica si una sesión quedó pagada (para la vista /payment/return)
   */
  async verifyCheckoutSessionPayment(sessionId: string): Promise<VerifyPaymentResponseDto> {
    if (!sessionId) throw new BadRequestException('sessionId requerido');
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      const paymentStatus = session.payment_status; // 'paid' | 'unpaid' | 'no_payment_required'
      const isComplete = session.status === 'complete' || paymentStatus === 'paid';

      const amount =
        typeof session.amount_total === 'number' ? session.amount_total : 0;

      return {
        isComplete,
        paymentStatus,
        customerId: (session.customer as string) || null,
        amount,
        currency: session.currency || 'mxn',
        sessionId: session.id,
      };
    } catch (error: any) {
      this.logger.error('Error al verificar pago', error?.stack || error);
      throw new BadRequestException(error?.message || 'No se pudo verificar el pago');
    }
  }

  /**
   * Webhook helpers
   */
  getWebhookSecret(): string {
    const ws = this.paymentConfigService.stripe.webhookSecret;
    if (!ws) throw new Error('STRIPE_WEBHOOK_SECRET no está configurado');
    return ws;
  }

  constructEventFromPayload(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  /**
   * Mapeo de alias -> priceId configurados en env
   */
  private getPriceId(code: string): string | null {
    const upper = (code || '').toUpperCase();
    switch (upper) {
      case 'CONGRESO':
        return this.paymentConfigService.stripe.priceCongreso || null;
      case 'PAQUETES':
      case 'PAQUETE':
        return this.paymentConfigService.stripe.pricePaquetes || null;
      case 'SOUVENIRS':
      case 'SOUVENIR':
        return this.paymentConfigService.stripe.priceSouvenirs || null;
      default:
        // también permitimos pasar directamente un price_ de Stripe
        if (upper.startsWith('PRICE_')) return code;
        return null;
    }
  }
}
