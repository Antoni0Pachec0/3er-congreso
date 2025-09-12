import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la respuesta de un pago procesado exitosamente
 * 
 * Esta clase representa la estructura de la respuesta cuando un pago
 * es procesado correctamente por MercadoPago
 */
export class PaymentResponseDto {
  @ApiProperty({
    description: 'Identificador único del pago en MercadoPago',
    example: 12345678
  })
  id: number;

  @ApiProperty({
    description: 'Estado del pago',
    example: 'approved',
    enum: ['approved', 'in_process', 'rejected', 'pending']
  })
  status: string;

  @ApiProperty({
    description: 'Detalle del estado del pago',
    example: 'accredited'
  })
  status_detail: string;

  @ApiProperty({
    description: 'Identificador del método de pago utilizado',
    example: 'visa'
  })
  payment_method_id: string;

  @ApiProperty({
    description: 'Tipo de pago realizado',
    example: 'credit_card'
  })
  payment_type_id: string;

  @ApiProperty({
    description: 'Monto de la transacción',
    example: 350.50
  })
  transaction_amount: number;

  @ApiProperty({
    description: 'Fecha y hora de aprobación del pago',
    example: '2025-09-10T18:30:00.000Z'
  })
  date_approved: string;

  @ApiProperty({
    description: 'Descripción del pago',
    example: 'Pago de congreso'
  })
  description: string;

  @ApiProperty({
    description: 'Información del pagador'
  })
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    }
  };
}

/**
 * DTO para representar errores en el procesamiento de pagos
 * 
 * Esta clase representa la estructura de la respuesta cuando ocurre
 * un error al procesar el pago
 */
export class PaymentErrorResponseDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del error',
    example: 'Error de validación de la tarjeta'
  })
  message: string;

  @ApiProperty({
    description: 'Detalles del error',
    example: {
      cause: 'Los datos de la tarjeta son inconsistentes con el token proporcionado',
      suggestion: 'Asegúrate de generar un nuevo token de tarjeta y que sea coherente con el método de pago',
      originalError: {
        message: 'diff_param_bins',
        error: 'bad_request',
        status: 400
      }
    }
  })
  details: any;

  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 400
  })
  status: number;
}
