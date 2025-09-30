import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma,PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { PaymentConfigService } from '../../config/payment.config';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';
import { VerifyPaymentResponseDto } from '../dto/verify-payment-response.dto';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class PaymentStripeService {
  private readonly logger = new Logger(PaymentStripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly paymentConfigService: PaymentConfigService,
    private readonly prisma: PrismaService,
  ) {
    const sk = this.paymentConfigService.stripe.secretKey;
    if (!sk) {
      throw new Error('STRIPE_SECRET_KEY no está configurada');
    }
    this.stripe = new Stripe(sk, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }


   /** Mapea Checkout.Session -> campos de tu tabla Payment */
    private mapSessionToBase(session: Stripe.Checkout.Session) {
    return {
      sessionId: session.id,
      status: (session.status ?? 'open') as string,
      paymentStatus: (session.payment_status ?? 'unpaid') as string,
      amountTotal: session.amount_total ?? 0,
      currency: session.currency ?? 'mxn',
      customerId: (session.customer as string) ?? null,
      customerEmail: session.customer_email ?? null,
      mode: (session.mode ?? 'payment') as string,
      clientReferenceId: session.client_reference_id ?? null,
      metadata: (session.metadata ?? {}) as Prisma.InputJsonValue,
    };
  }

  private async savePendingSession(session: Stripe.Checkout.Session, userId?: bigint) {
    const base = this.mapSessionToBase(session);

    const createData: Prisma.PaymentCreateInput = {
      id: randomUUID(),                 // <-- requerido por tu schema
      ...base,
      updatedAt: new Date(),            // <-- requerido por tu schema
      ...(userId ? { users: { connect: { user_id: userId } } } : {}),
    };
    const updateData: Prisma.PaymentUpdateInput = {
      status: base.status,
      paymentStatus: base.paymentStatus,
      amountTotal: base.amountTotal,
      currency: base.currency,
      customerId: base.customerId,
      customerEmail: base.customerEmail,
      mode: base.mode,
      clientReferenceId: base.clientReferenceId,
      metadata: base.metadata,
      updatedAt: new Date(),            // <-- requerido por tu schema
      ...(userId ? { users: { connect: { user_id: userId } } } : {}),
    };

    await this.prisma.payment.upsert({
      where: { sessionId: session.id },
      create: createData,
      update: updateData,
    });
  }

  async markPaidFromSession(session: Stripe.Checkout.Session) {
  // Obtener el PaymentIntent y el Charge de la sesión
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const latestCharge = (pi?.latest_charge as Stripe.Charge) || null;

  // Preparar los datos para actualizar el pago
  const data: Prisma.PaymentUpdateInput = {
    status: session.status ?? 'complete', // Usamos 'complete' como valor por defecto
    paymentStatus: session.payment_status ?? 'paid', // Usamos 'paid' como valor por defecto
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? 'mxn', // Si no hay moneda, usamos 'mxn'
    customerId: session.customer as string ?? null,
    customerEmail: session.customer_email ?? null,
    mode: session.mode ?? 'payment', // Usamos 'payment' como valor por defecto
    clientReferenceId: session.client_reference_id ?? null,
    metadata: session.metadata ?? {}, // Si no hay metadata, se asigna un objeto vacío
    paymentIntentId: pi?.id ?? null, // El ID del PaymentIntent
    paymentIntentStatus: pi?.status ?? null, // El estado del PaymentIntent
    chargeId: latestCharge?.id ?? null, // El ID del Charge
    receiptUrl: latestCharge?.receipt_url ?? null, // El URL del recibo
    paymentMethodType: latestCharge?.payment_method_details?.type ?? null, // Tipo de método de pago
    updatedAt: new Date(), // Establecemos la fecha de actualización
  };

  try {
    // Intentamos actualizar el pago si ya existe
    await this.prisma.payment.update({
      where: { sessionId: session.id }, // Buscamos el pago por el sessionId
      data, // Los datos que vamos a actualizar
    });
  } catch (error) {
    // Si no se encuentra el pago, lo creamos
    const createData: Prisma.PaymentCreateInput = {
      id: randomUUID(), // Generamos un ID único
      sessionId: session.id, // Usamos el sessionId
      status: session.status ?? 'complete', // Valor por defecto 'complete'
      paymentStatus: session.payment_status ?? 'paid', // Valor por defecto 'paid'
      amountTotal: session.amount_total ?? 0, // Si no hay monto, asignamos 0
      currency: session.currency ?? 'mxn', // Valor por defecto 'mxn'
      customerId: session.customer as string ?? null,
      customerEmail: session.customer_email ?? null,
      mode: session.mode ?? 'payment', // Valor por defecto 'payment'
      clientReferenceId: session.client_reference_id ?? null,
      metadata: session.metadata ?? {}, // Metadata vacía si no existe
      paymentIntentId: pi?.id ?? null, // PaymentIntent ID
      paymentIntentStatus: pi?.status ?? null, // Estado del PaymentIntent
      chargeId: latestCharge?.id ?? null, // Charge ID
      receiptUrl: latestCharge?.receipt_url ?? null, // URL del recibo
      paymentMethodType: latestCharge?.payment_method_details?.type ?? null, // Tipo de método de pago
      updatedAt: new Date(), // Fecha de actualización
    };

    // Creamos el nuevo pago en la base de datos
    await this.prisma.payment.create({ data: createData });
  }
}

  private extractUserIdFromBody(body: any): bigint | undefined {
    const raw = body?.userId ?? body?.metadata?.userId;
    if (raw === undefined || raw === null) return undefined;
    try { return BigInt(raw); } catch { return undefined; }
  }

  async createEmbeddedCheckoutSession(
    body: CreateCheckoutSessionDto,
  ): Promise<{ sessionId: string; clientSecret: string | null }> {
    try {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        throw new BadRequestException('items requerido y no puede estar vacío');
      }

      const lineItems = body.items.map((item) => {
        const priceId = this.getPriceId(item.price);
        if (!priceId) throw new BadRequestException(`Precio no definido: ${item.price}`);
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

      const userId = this.extractUserIdFromBody(body);
      await this.savePendingSession(session, userId);

      return { sessionId: session.id, clientSecret: session.client_secret ?? null };
    } catch (error: any) {
      this.logger.error('Error al crear sesión embedded', error?.stack || error);
      if (error?.type === 'StripeInvalidRequestError') {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(error?.message || 'Error al crear la sesión de Stripe');
    }
  }

  async retrieveSessionExpanded(sessionId: string) {
    return await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge'],
    });
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
