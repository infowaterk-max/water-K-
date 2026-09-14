import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutRecoverySaver } from '@/components/checkout/checkout-recovery-saver';
import { getCommerceAccess } from '@/lib/commerce/access';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { requireStorefrontAccess } from '@/lib/storefront/access';

export default async function Checkout(){
  await requireStorefrontAccess();
  const[settings,access]=await Promise.all([getCommerceSettings(),getCommerceAccess()]);
  return <main className="section checkoutShowcase" data-shared-checkout-contract="guided-accordion-v1"><div className="shell checkoutShell">
    <div className="checkoutHead"><div><span className="showcaseKicker">Biztonságos pénztár</span><h1>Rendelés véglegesítése.</h1></div><p>Add meg a szállításhoz szükséges adatokat, válassz fizetési módot, majd ellenőrizd a rendelést.</p></div>
    <div className="commerceSteps" aria-label="Rendelési folyamat"><span>1 · Kosár</span><span className="active">2 · Szállítás</span><span>3 · Fizetés</span><span>4 · Összesítés</span></div>
    <CheckoutRecoverySaver/>
    <CheckoutForm shippingOptions={settings.shippingOptions} paymentOptions={settings.paymentOptions} freeShippingThreshold={settings.freeShippingThreshold} resellerApproved={access.resellerApproved}/>
    <div className="checkoutSecurity"><span>✓ Biztonságos adatkezelés</span><span>✓ Ellenőrzött készlet és ár</span><span>✓ Rendelés előtti összesítés</span></div>
  </div></main>;
}
