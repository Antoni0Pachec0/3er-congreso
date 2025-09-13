import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
    paymentMarket: {
        accessToken: process.env.PAYMENT_ACCESS_TOKEN || '',
        // Otras opciones de configuración para payment market
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publicKey: process.env.STRIPE_PUBLIC_KEY ,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        domain: process.env.APP_DOMAIN || 'http://localhost:3001',
        priceCongreso: process.env.PRICE_CONGRESO ,
        pricePaquetes: process.env.PRICE_PAQUETES ,
        priceSouvenirs: process.env.PRICE_SOUVENIRS ,
        // Otras opciones de configuración para Stripe
    }
}));


