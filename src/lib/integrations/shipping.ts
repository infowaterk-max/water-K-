import type { ShippingProvider } from './types';

type QuoteInput = Parameters<ShippingProvider['quote']>[0];
type ShipmentInput = Parameters<ShippingProvider['createShipment']>[0];
type QuoteResult = ReturnType<ShippingProvider['quote']>;
type ShipmentResult = ReturnType<ShippingProvider['createShipment']>;

abstract class UnconfiguredShippingProvider implements ShippingProvider {
  protected abstract readonly providerName: string;

  async quote(_input: QuoteInput): QuoteResult {
    throw new Error(`${this.providerName} API credentials required`);
  }

  async createShipment(_input: ShipmentInput): ShipmentResult {
    throw new Error(`${this.providerName} API credentials required`);
  }
}

export class FoxpostShipping extends UnconfiguredShippingProvider {
  protected readonly providerName = 'Foxpost';
}

export class GlsShipping extends UnconfiguredShippingProvider {
  protected readonly providerName = 'GLS';
}

export class MplShipping extends UnconfiguredShippingProvider {
  protected readonly providerName = 'MPL';
}
