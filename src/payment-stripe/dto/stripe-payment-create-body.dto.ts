// src/payment/stripe/dto/checkout-session.dto.ts
import { IsArray, IsInt, IsOptional, IsPositive, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LineItemDto {
    /**
     * El ID del precio en Stripe o uno de los valores predefinidos:
     * - 'CONGRESO': Usa el precio configurado en PRICE_CONGRESO
     * - 'PAQUETE': Usa el precio configurado en PRICE_PAQUETES
     * - 'SOUVENIR': Usa el precio configurado en PRICE_SOUVENIRS
     * - O cualquier ID de precio válido de Stripe
     */
    @ApiProperty({
        description: 'ID del precio en Stripe o código predefinido (CONGRESO, PAQUETE, SOUVENIR)',
        example: 'CONGRESO',
        type: String
    })
    @IsString()
    price: string;

    /**
     * Cantidad del item a comprar
     */
    @ApiProperty({
        description: 'Cantidad del producto a comprar',
        example: 1,
        type: Number,
        minimum: 1
    })
    @IsInt()
    @IsPositive()
    quantity: number;
}

export class CreateCheckoutSessionDto {
    @ApiProperty({
        description: 'Lista de productos a comprar',
        type: [LineItemDto],
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    items: LineItemDto[];  

    @ApiProperty({
        description: 'URL a la que se redirigirá después de un pago exitoso',
        example: 'https://tudominio.com/payment/success',
        required: false
    })
    @IsOptional()
    @IsUrl()
    successUrl?: string;

    @ApiProperty({
        description: 'URL a la que se redirigirá si el pago es cancelado',
        example: 'https://tudominio.com/payment/cancel',
        required: false
    })
    @IsOptional()
    @IsUrl()
    cancelUrl?: string;

    @ApiProperty({
        description: 'URL de retorno después de cualquier resultado del pago',
        example: 'https://tudominio.com/payment/return',
        required: false
    })
    @IsOptional()
    @IsUrl()
    returnUrl?: string;
}