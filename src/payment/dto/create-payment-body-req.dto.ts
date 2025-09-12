import { IsNumber, IsString, IsObject, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

/**
 * DTO para la estructura del cuerpo de la solicitud a MercadoPago
 * 
 * Este objeto representa la estructura exacta que se envía a la API de MercadoPago
 * para procesar un pago.
 */
export class CreatePaymentBodyDto {
    @ApiProperty({
        description: 'Token de tarjeta generado por el SDK de MercadoPago',
        example: '2c933e94-5ab4-4321-9010-c35aad8bg2cc'
    })
    @IsString()
    token: string;

    @ApiProperty({
        description: 'Identificador del método de pago',
        example: 'visa'
    })
    @IsString()
    payment_method_id: string;

    @ApiProperty({
        description: 'Monto total de la transacción',
        example: 350.50
    })
    @IsNumber()
    transaction_amount: number;

    @ApiProperty({
        description: 'Número de cuotas para el pago',
        example: 1,
        default: 1
    })
    @IsNumber()
    installments: number;

    @ApiProperty({
        description: 'Descripción del pago',
        example: 'Pago de congreso'
    })
    @IsString()
    description: string;

    @ApiProperty({
        description: 'Información del pagador',
        type: () => PayerBodyReqDto
    })
    @IsObject()
    @ValidateNested()
    @Type(() => PayerBodyReqDto)
    payer: PayerBodyReqDto;
}

class PayerBodyReqDto {
    @ApiProperty({
        description: 'Correo electrónico del pagador',
        example: 'comprador@email.com'
    })
    @IsString()
    email: string;

    @ApiProperty({
        description: 'Información de identificación del pagador',
        type: () => IdentificationBodyReqDto
    })
    @IsObject()
    @ValidateNested()
    @Type(() => IdentificationBodyReqDto)
    identification: IdentificationBodyReqDto;
}

class IdentificationBodyReqDto {
    @ApiProperty({
        description: 'Tipo de identificación',
        example: 'DNI'
    })
    @IsString()
    type: string;

    @ApiProperty({
        description: 'Número de identificación',
        example: '12345678'
    })
    @IsString()
    number: string;
}
