import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import paymentConfig from '../../config/payment.config';
import { randomUUID } from 'crypto';
import { CreatePaymentBodyDto } from '../dto/create-payment-body-req.dto';
import { CreatePaymentReqDto } from '../dto/create-payment-req.dto';
import { HttpService } from '@nestjs/axios/dist/http.service';
import { CreatePaymentResDto } from '../dto/create-payment-res.dto';
import { plainToInstance } from 'class-transformer';
@Injectable()
export class PaymentCardService {
    constructor(
        @Inject(paymentConfig.KEY)
        private readonly paymentConfigService: ConfigType<typeof paymentConfig>,
        private readonly httpService: HttpService,
    ) {}
    async createPayment(body: CreatePaymentReqDto) : Promise<CreatePaymentResDto>{
        const xIdempotencyKey = randomUUID();
        const bearerToken = this.paymentConfigService.paymentMarket.accessToken;
        const paymentBodyReq: CreatePaymentBodyDto = {
            description:body.description,
            installments: body.installments,
            token: body.token,
            transaction_amount:body.transactionAmount,
            payment_method_id: body.paymentMethodId,
            payer:{
                email: body.email, 
                identification:{
                    type: body.identificationType,
                    number: body.identificationNumber
                },
            },
        };

        try{
            const response = await this.httpService.axiosRef.post('https://api.mercadopago.com/v1/payments',
            paymentBodyReq,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`,
                    'X-Idempotency-Key': xIdempotencyKey,
                },
            },
        );
        return plainToInstance(CreatePaymentResDto,  response.data, { 
            excludeExtraneousValues: true,
        });
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Error processing payment');
        }
        
        
    }
    
    deletePaymentCard(id: string) {
        // Lógica para eliminar una tarjeta de pago
    }
    
    updatePaymentCard(id: string, data: any) {
        // Lógica para actualizar una tarjeta de pago
    }
    
    getPaymentCardById(id: string) {
        // Lógica para obtener una tarjeta de pago por ID
    }
}
