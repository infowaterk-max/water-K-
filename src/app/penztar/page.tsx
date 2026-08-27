import { CheckoutForm } from '@/components/checkout/checkout-form';

export default function Checkout(){
  const khEnabled=Boolean(process.env.KH_MERCHANT_ID&&(process.env.KH_SECRET||process.env.KH_API_SECRET));
  return <main className="section"><div className="shell"><span className="eyebrow">Biztonságos rendelés</span><CheckoutForm khEnabled={khEnabled}/></div></main>;
}
