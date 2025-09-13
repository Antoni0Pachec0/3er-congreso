import { Injectable, BadRequestException, InternalServerErrorException, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Stripe from 'stripe';
import paymentConfig from '../../config/payment.config';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';
@Injectable()
export class PaymentStripeService {
  private stripe: Stripe;

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly paymentConfigService: ConfigType<typeof paymentConfig>,
  ){
    const secret = this.paymentConfigService.stripe.secretKey;
    if (!secret) {
      throw new Error('Stripe secret key is not defined');
    }
    // Usando la versión predeterminada de la API para evitar problemas de tipo
    this.stripe = new Stripe(secret, {
      apiVersion: '2025-08-27.basil',
    });
  }
  /**
   * Obtiene el ID de precio real basado en un identificador predefinido o usa el ID directo
   */
  private getPriceId(priceKey: string): string {
    // Mapa de precios predefinidos a sus configuraciones correspondientes
    const priceMap: Record<string, { id?: string, errorMsg: string }> = {
      'CONGRESO': { 
        id: this.paymentConfigService.stripe.priceCongreso, 
        errorMsg: 'El precio del congreso no está configurado' 
      },
      'PAQUETE': { 
        id: this.paymentConfigService.stripe.pricePaquetes, 
        errorMsg: 'El precio de paquetes no está configurado' 
      },
      'SOUVENIR': { 
        id: this.paymentConfigService.stripe.priceSouvenirs, 
        errorMsg: 'El precio de souvenirs no está configurado' 
      }
    };

    // Verificar si es un tipo predefinido
    const priceConfig = priceMap[priceKey];
    
    if (priceConfig) {
      if (!priceConfig.id) {
        throw new BadRequestException(priceConfig.errorMsg);
      }
      return priceConfig.id;
    }

    // Si no es un tipo predefinido, asumimos que es un ID directo de Stripe
    return priceKey;
  }

  async    createEmbeddedCheckoutSession(body: CreateCheckoutSessionDto) {
    try {
      // Procesar los items y determinar si necesitamos usar precios predefinidos
      const lineItems = body.items.map(item => {
        const priceId = this.getPriceId(item.price);
        
        if (!priceId) {
          throw new BadRequestException(`Precio no definido: ${item.price}`);
        }

        return {
          price: priceId,
          quantity: item.quantity,
        };
      });

      // Crear una sesión de checkout de Stripe
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: lineItems,
        success_url: body.successUrl || `${this.paymentConfigService.stripe.domain}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: body.cancelUrl || `${this.paymentConfigService.stripe.domain}/payment/cancel`,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      // Si ya es una excepción de NestJS, simplemente la reenviamos
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // Si es un error de Stripe, devolvemos un mensaje más detallado
      if (error instanceof Stripe.errors.StripeError) {
        // Manejar diferentes tipos de errores de Stripe con mensajes específicos
        switch (error.type) {
          case 'StripeCardError':
            throw new BadRequestException(`Error en la tarjeta: ${error.message}`);
          case 'StripeInvalidRequestError':
            throw new BadRequestException(`Solicitud inválida: ${error.message}`);
          case 'StripeRateLimitError':
            throw new InternalServerErrorException('Demasiadas solicitudes a Stripe. Intente nuevamente más tarde.');
          default:
            throw new BadRequestException(`Error de Stripe: ${error.message}`);
        }
      }
      
      // Para cualquier otro tipo de error
      throw new InternalServerErrorException('Error al crear la sesión de pago');
    }
  }
  /**
   * Recupera los detalles de una sesión de checkout
   */
  async getCheckoutSessionDetails(sessionId: string) {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Error de Stripe: ${error.message}`);
      }
      throw new InternalServerErrorException('Error al recuperar la sesión de pago');
    }
  }

  /**
   * Verifica que una sesión de checkout se haya completado correctamente
   */
  async verifyCheckoutSessionPayment(sessionId: string) {
    const session = await this.getCheckoutSessionDetails(sessionId);
    return {
      isComplete: session.payment_status === 'paid',
      paymentStatus: session.payment_status,
      customerId: session.customer,
      amount: session.amount_total ? session.amount_total / 100 : 0, // Convertir de centavos a pesos
    };
  }

}
