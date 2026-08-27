import type { InvoiceProvider } from './types';

export class UnconfiguredInvoiceProvider implements InvoiceProvider {
  async createInvoice(_input: Parameters<InvoiceProvider['createInvoice']>[0]): ReturnType<InvoiceProvider['createInvoice']> {
    throw new Error('Invoice provider credentials and API contract required');
  }
}

export function getInvoiceProvider(): InvoiceProvider {
  return new UnconfiguredInvoiceProvider();
}
