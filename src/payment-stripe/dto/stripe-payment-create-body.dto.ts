// src/payment/stripe/dto/checkout-session.dto.ts
import { IsArray, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LineItemDto {
    @IsString()
    price: string;

    @IsString()
    quantity: number;
}

export class CreateCheckoutSessionDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    items: LineItemDto[];

    @IsUrl()
    successUrl?: string;

    @IsUrl()
    cancelUrl?: string;

    @IsUrl()
    returnUrl?: string;
}