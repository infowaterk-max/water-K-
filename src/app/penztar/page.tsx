import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutRecoverySaver } from '@/components/checkout/checkout-recovery-saver';
export default function Checkout(){const khEnabled=Boolean(process.env.KH_MERCHANT_ID&&(process.env.KH_SECRET||process.env.KH_API_SECRET));return <main className="section"><div className="shell"><span className="eyebrow">Biztonságos rendelés</span><CheckoutRecoverySaver/><CheckoutForm khEnabled={khEnabled}/></div></main>}
