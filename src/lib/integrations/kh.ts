import type { PaymentGateway } from './types';

export class KhPaymentGateway implements PaymentGateway {
  async createPayment(
    _input: Parameters<PaymentGateway['createPayment']>[0],
  ): ReturnType<PaymentGateway['createPayment']> {
    throw new Error('K&H sandbox adapter: credentials and bank API contract required');
  }

  async verifyCallback(
    _payload: Parameters<PaymentGateway['verifyCallback']>[0],
  ): ReturnType<PaymentGateway['verifyCallback']> {
    throw new Error('K&H callback verification not configured');
  }
}
