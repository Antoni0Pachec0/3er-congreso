import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { PaymentCardService } from '../services/payment-card.service';
import { CreatePaymentReqDto } from '../dto/create-payment-req.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBadRequestResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { PaymentResponseDto, PaymentErrorResponseDto } from '../dto/payment-response.dto';

@ApiTags('Payment Card')
@Controller('payment-card')
export class PaymentCardController {
    constructor(private readonly paymentCardService: PaymentCardService) { }
    
    /**
     * Crea un nuevo pago a través de MercadoPago
     * 
     * Este endpoint procesa un pago utilizando la API de MercadoPago.
     * Requiere un token de tarjeta válido generado por el SDK de MercadoPago
     * en el frontend.
     */
    @Post()
    @ApiOperation({ 
        summary: 'Procesar un nuevo pago',
        description: 'Crea un nuevo pago utilizando MercadoPago como gateway de pago. El token debe ser generado previamente por el SDK de MercadoPago.'
    })
    @ApiBody({
        type: CreatePaymentReqDto,
        description: 'Datos necesarios para procesar el pago'
    })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'El pago ha sido procesado correctamente',
        type: PaymentResponseDto
    })
    @ApiBadRequestResponse({ 
        description: 'Error de validación en los datos proporcionados',
        type: PaymentErrorResponseDto
    })
    @ApiInternalServerErrorResponse({ 
        description: 'Error interno del servidor al procesar el pago' 
    })
    createPayment(@Body() body: CreatePaymentReqDto) {
        return this.paymentCardService.createPayment(body);
    }
}

