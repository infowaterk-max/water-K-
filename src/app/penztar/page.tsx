import {headers} from 'next/headers';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutRecoverySaver } from '@/components/checkout/checkout-recovery-saver';
import { StorefrontCheckoutShell } from '@/components/checkout/storefront-checkout-shell';
import { getCommerceAccess } from '@/lib/commerce/access';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { resolveCurrentStorefrontCheckoutRuntimePage } from '@/lib/builder/storefront-runtime-source';
import type { StorefrontViewport } from '@/lib/builder/storefront-foundation';
import { getPilotAcceptanceInstanceId } from '@/lib/storefront/pilot-access';
import { requireStorefrontAccess } from '@/lib/storefront/access';

function storefrontViewportFromUserAgent(userAgent:string):StorefrontViewport{
  const value=userAgent.toLowerCase();
  if(/ipad|tablet|kindle|silk/.test(value))return'tablet';
  if(/mobi|iphone|ipod|android/.test(value))return'mobile';
  return'desktop';
}

export default async function Checkout(){
  const instance=await requireStorefrontAccess();
  const[settings,access,runtime,acceptanceInstanceId,userAgent]=await Promise.all([
    getCommerceSettings(),
    getCommerceAccess(),
    resolveCurrentStorefrontCheckoutRuntimePage(),
    process.env.VERCEL_ENV==='preview'?getPilotAcceptanceInstanceId():Promise.resolve(null),
    headers().then(value=>value.get('user-agent')??''),
  ]);
  const acceptancePreview=Boolean(instance&&acceptanceInstanceId===instance.id&&process.env.VERCEL_ENV==='preview');
  const form=<>
    <CheckoutRecoverySaver/>
    <CheckoutForm
      shippingOptions={settings.shippingOptions}
      paymentOptions={settings.paymentOptions}
      freeShippingThreshold={settings.freeShippingThreshold}
      resellerApproved={access.resellerApproved}
      embedded={Boolean(runtime)}
      acceptancePreview={acceptancePreview}
    />
  </>;
  if(runtime)return <StorefrontCheckoutShell runtime={runtime} viewport={storefrontViewportFromUserAgent(userAgent)}>{form}</StorefrontCheckoutShell>;

  return <main className="section checkoutShowcase" data-shared-checkout-contract="guided-accordion-v1" data-storefront-checkout-fallback="legacy"><div className="shell checkoutShell">
    <div className="checkoutHead"><div><span className="showcaseKicker">Biztonságos pénztár</span><h1>Rendelés véglegesítése.</h1></div><p>Add meg a szállításhoz szükséges adatokat, válassz fizetési módot, majd ellenőrizd a rendelést.</p></div>
    <div className="commerceSteps" aria-label="Rendelési folyamat"><span>1 · Kosár</span><span className="active">2 · Szállítás</span><span>3 · Fizetés</span><span>4 · Összesítés</span></div>
    {form}
    <div className="checkoutSecurity"><span>✓ Biztonságos adatkezelés</span><span>✓ Ellenőrzött készlet és ár</span><span>✓ Rendelés előtti összesítés</span></div>
  </div></main>;
}
