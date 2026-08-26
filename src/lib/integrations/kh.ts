import type { PaymentGateway } from './types';
export class KhPaymentGateway implements PaymentGateway{
 async createPayment(){throw new Error('K&H sandbox adapter: credentials and bank API contract required');}
 async verifyCallback(){throw new Error('K&H callback verification not configured');}
}
