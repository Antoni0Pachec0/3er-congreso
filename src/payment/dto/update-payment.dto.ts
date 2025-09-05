import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment-intent.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
