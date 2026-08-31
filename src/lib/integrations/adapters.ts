import 'server-only';
import { KhPaymentGateway } from '@/lib/integrations/kh';
import { FoxpostShipping,GlsShipping,MplShipping } from '@/lib/integrations/shipping';
import type { PaymentGateway,ShippingProvider } from '@/lib/integrations/types';

type Factory<T>=()=>T;
const paymentAdapters:Record<string,Factory<PaymentGateway>>={kh:()=>new KhPaymentGateway()};
const shippingAdapters:Record<string,Factory<ShippingProvider>>={foxpost:()=>new FoxpostShipping(),gls:()=>new GlsShipping(),mpl:()=>new MplShipping()};

export function getPaymentGatewayAdapter(adapterKey:string):PaymentGateway{const factory=paymentAdapters[adapterKey];if(!factory)throw new Error(`Payment adapter not installed: ${adapterKey}`);return factory()}
export function getShippingProviderAdapter(adapterKey:string):ShippingProvider{const factory=shippingAdapters[adapterKey];if(!factory)throw new Error(`Shipping adapter not installed: ${adapterKey}`);return factory()}
export function hasPaymentGatewayAdapter(adapterKey:string){return Boolean(paymentAdapters[adapterKey])}
export function hasShippingProviderAdapter(adapterKey:string){return Boolean(shippingAdapters[adapterKey])}
