import { IsString, IsIn, IsInt, IsOptional, IsArray, Min, ValidateNested} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

// DTO for individual payment items in the payment intent request payload to validate structure and types.
export class PaymentItemDto {
    @IsString() ticketType!: string;
    @IsInt() @Min(1) quantity!: number; 
    @IsInt() @Min(0) unitCent!: number;
}


// DTO for creating a payment intent request payload to validate structure and types.
export class CreatePaymentIntentDto {
    @ApiProperty({description: 'Order ID as a string representing a bigint', example: '123456789012345678'})
    @IsString() orderId!: string;
    @IsString() @IsIn(['MXN']) currency!: 'MXN' ;
    @IsArray() @ValidateNested({each: true}) @Type(() => PaymentItemDto) items!: PaymentItemDto[];
    @IsOptional() @IsString() customerEmail?: string;
}