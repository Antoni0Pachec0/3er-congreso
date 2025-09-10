import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreatePaymentReqDto {
    //cada una de las propiedades que se van a enviar en el body
    //para la creacion del pago
    //segun la documentacion de mercadopago
    //https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post/
    //nada puede ir vacio y debe cumplir con su tipo
    @ApiProperty()
    @IsNumber()
    installments: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    transactionAmount: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;

    @ApiProperty()
    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    identificationType: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    identificationNumber: string;
}