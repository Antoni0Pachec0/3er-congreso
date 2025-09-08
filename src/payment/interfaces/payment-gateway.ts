export interface PaymentIntentInit {
    orderId: bigint;
    amountCents: number;
    currency: 'MXN' ;
    description?: string;
    customerEmail?: string;
    idempotencyKey?: string;
}
export interface PaymentIntentResult {
    id: string;
    clientSecret?: string;   // sólo Stripe
    checkoutUrl?: string;    // Checkout Pro de MP
    raw?: unknown;
}
export type GatewayEventType = 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
export interface GatewayEvent {
    type: GatewayEventType;
    paymentId: string;
    orderId?: bigint;
    amountReceivedCents?: number;
    raw: unknown;
}
export interface PaymentGateway {
    createPaymentIntent(init: PaymentIntentInit): Promise<PaymentIntentResult>;
    verifyAndParseWebhook(payload: Buffer, signature?: string): Promise<GatewayEvent>;
}
