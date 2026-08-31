import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutRecoverySaver } from '@/components/checkout/checkout-recovery-saver';
import { getCommerceSettings } from '@/lib/commerce/settings';
export default async function Checkout(){const settings=await getCommerceSettings();return <main className="section"><div className="shell"><span className="eyebrow">Biztonságos rendelés</span><CheckoutRecoverySaver/><CheckoutForm shippingOptions={settings.shippingOptions} paymentOptions={settings.paymentOptions} freeShippingThreshold={settings.freeShippingThreshold}/></div></main>}
