import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
    paymentMarket: {
        accessToken: process.env.PAYMENT_ACCESS_TOKEN || '',
        // Otras opciones de configuración para payment market
    },
    // Otras secciones de configuración relacionadas con pagos
}));
