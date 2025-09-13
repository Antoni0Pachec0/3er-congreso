import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentResponseDto {
    @ApiProperty({
        description: 'Indica si el pago se completó exitosamente',
        example: true
    })
    isComplete: boolean;

    @ApiProperty({
        description: 'Estado actual del pago',
        example: 'paid',
        enum: ['paid', 'unpaid', 'no_payment_required', 'pending']
    })
    paymentStatus: string;

    @ApiProperty({
        description: 'ID del cliente en Stripe',
        example: 'cus_1234567890',
        nullable: true
    })
    customerId: string | null;

    @ApiProperty({
        description: 'Monto del pago en la moneda base (pesos)',
        example: 1500
    })
    amount: number;
}
