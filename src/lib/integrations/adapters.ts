import 'server-only';
import { KhPaymentGateway } from '@/lib/integrations/kh';
import { StripePaymentGateway } from '@/lib/integrations/stripe';
import { SimplePayPaymentGateway } from '@/lib/integrations/simplepay';
import { BarionPaymentGateway } from '@/lib/integrations/barion';
import { FoxpostShipping,GlsShipping,MplShipping,DpdShipping,ExpressOneShipping } from '@/lib/integrations/shipping';
import { PacketaShipping } from '@/lib/integrations/packeta';
import type { PaymentGateway,ShippingProvider } from '@/lib/integrations/types';

type Factory<T>=()=>T;
const paymentAdapters:Record<string,Factory<PaymentGateway>>={kh:()=>new KhPaymentGateway(),stripe:()=>new StripePaymentGateway(),simplepay:()=>new SimplePayPaymentGateway(),barion:()=>new BarionPaymentGateway()};
const shippingAdapters:Record<string,Factory<ShippingProvider>>={foxpost:()=>new FoxpostShipping(),gls:()=>new GlsShipping(),mpl:()=>new MplShipping(),dpd:()=>new DpdShipping(),packeta:()=>new PacketaShipping(),expressone:()=>new ExpressOneShipping()};

export function getPaymentGatewayAdapter(adapterKey:string):PaymentGateway{const factory=paymentAdapters[adapterKey];if(!factory)throw new Error(`Payment adapter not installed: ${adapterKey}`);return factory()}
export function getShippingProviderAdapter(adapterKey:string):ShippingProvider{const factory=shippingAdapters[adapterKey];if(!factory)throw new Error(`Shipping adapter not installed: ${adapterKey}`);return factory()}
export function hasPaymentGatewayAdapter(adapterKey:string){return Boolean(paymentAdapters[adapterKey])}
export function hasShippingProviderAdapter(adapterKey:string){return Boolean(shippingAdapters[adapterKey])}
