import type { ShippingProvider } from './types';
export class FoxpostShipping implements ShippingProvider{async quote(){throw new Error('Foxpost API credentials required');}async createShipment(){throw new Error('Foxpost API credentials required');}}
export class GlsShipping implements ShippingProvider{async quote(){throw new Error('GLS API credentials required');}async createShipment(){throw new Error('GLS API credentials required');}}
export class MplShipping implements ShippingProvider{async quote(){throw new Error('MPL API credentials required');}async createShipment(){throw new Error('MPL API credentials required');}}
