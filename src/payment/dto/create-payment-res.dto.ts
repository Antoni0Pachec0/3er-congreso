import { Expose } from "class-transformer";

export class CreatePaymentResDto {
    @Expose()
    status: string;
    @Expose()
    status_detail: string;
    @Expose()
    id: number;
    @Expose()
    transaction_amount: number;
    @Expose()
    payment_method_id: string;
    @Expose()
    description: string;
    @Expose()
    date_approved: string;  
    @Expose()
    date_created: string;
    @Expose()
    date_last_updated: string
}
