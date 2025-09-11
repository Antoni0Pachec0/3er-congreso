import { IsNumber, IsString } from "class-validator";

export class CreatePaymentBodyDto {
    // Define the properties of the payment body here
    @IsString()
    token: string;
    @IsString()
    payment_method_id: string;
    @IsNumber()
    transaction_amount: number;
    @IsNumber()
    installments: number;
    @IsString()
    description: string;
    payer: PayerBodyReqDto;

}

class PayerBodyReqDto {
    @IsString()
    email: string;
    identification: IdentificationBodyReqDto;
}

class IdentificationBodyReqDto {
    @IsString()
    type: string;
    @IsString()
    number: string;
}
