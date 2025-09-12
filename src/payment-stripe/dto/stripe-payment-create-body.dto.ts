// src/payment/stripe/dto/checkout-session.dto.ts
import { IsArray, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
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

    @IsOptional()
    @IsUrl()
    successUrl?: string;

    @IsOptional()
    @IsUrl()
    cancelUrl?: string;

    @IsOptional()
    @IsUrl()
    returnUrl?: string;
}