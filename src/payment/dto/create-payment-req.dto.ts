import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsString, Min, Max } from "class-validator";

/**
 * DTO para la creación de un nuevo pago a través de MercadoPago
 * 
 * Este DTO sigue la estructura requerida por la API de MercadoPago:
 * https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post/
 */
export class CreatePaymentReqDto {
    @ApiProperty({
        description: 'Número de cuotas para el pago',
        example: 1,
        minimum: 1,
        default: 1
    })
    @IsNumber()
    
    installments: number;

    @ApiProperty({
        description: 'Monto total de la transacción',
        example: 350.50,
        minimum: 1
    })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    transactionAmount: number;

    @ApiProperty({
        description: 'Descripción del pago',
        example: 'Pago de congreso',
        maxLength: 256
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'Token de tarjeta generado por el SDK de MercadoPago',
        example: '2c933e94-5ab4-4321-9010-c35aad8bg2cc',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({
        description: 'Identificador del método de pago',
        example: 'visa',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;

    @ApiProperty({
        description: 'Correo electrónico del pagador',
        example: 'comprador@email.com',
        required: true
    })
    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Tipo de identificación del pagador',
        example: 'DNI',
        required: true
    })
    @IsString()
    
    identificationType: string;

    @ApiProperty({
        description: 'Número de identificación del pagador',
        example: '12345678',
        required: true
    })
    @IsString()
    
    identificationNumber: string;
}