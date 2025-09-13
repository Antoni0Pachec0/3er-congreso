import { Controller, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { PaymentStripeService } from '../service/payment-stripe.service';
import { CreateCheckoutSessionDto } from '../dto/stripe-payment-create-body.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CheckoutSessionResponseDto } from '../dto/checkout-session-response.dto';
import { VerifyPaymentResponseDto } from '../dto/verify-payment-response.dto';
import { StripeErrorDto } from '../dto/stripe-error.dto';

@ApiTags('stripe')
@Controller('payment-stripe')
export class PaymentStripeController {
    constructor(private readonly paymentStripeService: PaymentStripeService) { }

    @Post('create-checkout-session')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Crear una sesión de pago de Stripe',
        description: 'Crea una nueva sesión de pago utilizando Stripe Checkout'
    })
    @ApiBody({
        type: CreateCheckoutSessionDto,
        description: 'Datos para crear la sesión de pago'
    })
    @ApiResponse({
        status: 200,
        description: 'Sesión creada exitosamente',
        type: CheckoutSessionResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Datos inválidos o error en la configuración de Stripe',
        type: StripeErrorDto
    })
    @ApiResponse({
        status: 500,
        description: 'Error interno del servidor',
        type: StripeErrorDto
    })
    async createCheckoutSession(@Body() createCheckoutSessionDto: CreateCheckoutSessionDto) {
        return await this.paymentStripeService.createEmbeddedCheckoutSession(createCheckoutSessionDto);
    }

    @Post('verify-payment/:sessionId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verificar estado de un pago',
        description: 'Verifica si un pago se ha completado correctamente usando el ID de sesión'
    })
    @ApiResponse({
        status: 200,
        description: 'Estado del pago verificado',
        type: VerifyPaymentResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'ID de sesión inválido o error al verificar el pago',
        type: StripeErrorDto
    })
    @ApiResponse({
        status: 500,
        description: 'Error interno del servidor',
        type: StripeErrorDto
    })
    async verifyPayment(@Param('sessionId') sessionId: string) {
        return await this.paymentStripeService.verifyCheckoutSessionPayment(sessionId);
    }
}
