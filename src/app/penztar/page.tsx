import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutRecoverySaver } from '@/components/checkout/checkout-recovery-saver';
import { getCommerceAccess } from '@/lib/commerce/access';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { requireStorefrontAccess } from '@/lib/storefront/access';

export default async function Checkout(){
  await requireStorefrontAccess();
  const[settings,access]=await Promise.all([getCommerceSettings(),getCommerceAccess()]);
  return <main className="section checkoutShowcase"><div className="shell checkoutShell">
    <div className="checkoutHead"><div><span className="showcaseKicker">Biztonságos pénztár</span><h1>Rendelés véglegesítése.</h1></div><p>Add meg a számlázási és szállítási adatokat, válassz átvételi és fizetési módot, majd ellenőrizd a rendelést.</p></div>
    <div className="commerceSteps"><span>1 · Kosár</span><span className="active">2 · Adatok és szállítás</span><span>3 · Fizetés és rendelés</span></div>
    <CheckoutRecoverySaver/>
    <CheckoutForm shippingOptions={settings.shippingOptions} paymentOptions={settings.paymentOptions} freeShippingThreshold={settings.freeShippingThreshold} resellerApproved={access.resellerApproved}/>
    <div className="checkoutSecurity"><span>✓ Biztonságos adatkezelés</span><span>✓ Ellenőrzött készlet és ár</span><span>✓ Rendelés előtti összesítés</span></div>
  </div></main>;
}
