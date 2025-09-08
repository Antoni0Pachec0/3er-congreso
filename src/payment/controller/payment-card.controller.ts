import { Controller, Post, Body } from '@nestjs/common';
import { PaymentCardService } from '../services/payment-card.service';
import { CreatePaymentReqDto } from '../dto/create-payment-req.dto';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Payment Card')
@Controller('payment-card')
export class PaymentCardController {
    constructor(private readonly paymentCardService: PaymentCardService) { }
    //metodo para la llamada del servicio de crear pago
    @Post()
    createPayment(@Body() body: CreatePaymentReqDto) {
        return this.paymentCardService.createPayment(body);
    }
}

