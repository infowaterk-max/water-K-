'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';

export function CheckoutForm() {
  const { cart, clear } = useCart();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');

    const formData = new FormData(event.currentTarget);
    const checkout = Object.fromEntries(formData.entries());
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ checkout, items: cart.items }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setState('error');
      setError(payload.error ?? 'Nem sikerült létrehozni a rendelést.');
      return;
    }

    clear();
    const query = new URLSearchParams({ order: payload.orderNumber, status: payload.status });
    router.push(`/rendeles-sikeres?${query.toString()}`);
  }

  return (
    <form className="checkout-form" onSubmit={submit}>
      <div className="checkoutHeading">
        <span className="eyebrow">Biztonságos rendelés</span>
        <h1>Pénztár</h1>
        <p className="muted">A rendelés előtt minden adatot ellenőrizhetsz. Bankkártyás fizetés stagingben még nem indít valódi K&H tranzakciót.</p>
      </div>
      <div className="form-grid">
        <input name="name" required placeholder="Név / kapcsolattartó" />
        <input name="email" required type="email" placeholder="E-mail" />
        <input name="phone" required placeholder="Telefonszám" />
        <select name="customerType" defaultValue="retail"><option value="retail">Lakossági</option><option value="company">Céges</option><option value="reseller">Viszonteladó</option></select>
        <input name="companyName" placeholder="Cégnév (ha releváns)" />
        <input name="taxNumber" placeholder="Adószám (ha releváns)" />
        <input name="billingAddress" required placeholder="Számlázási cím" />
        <input name="shippingAddress" required placeholder="Szállítási cím" />
        <select name="shippingMethod" defaultValue="foxpost"><option value="foxpost">Foxpost</option><option value="gls">GLS</option><option value="mpl">MPL</option><option value="pickup">Személyes átvétel</option></select>
        <select name="paymentMethod" defaultValue="kh_card"><option value="kh_card">Bankkártya – K&H</option><option value="bank_transfer">Banki átutalás</option></select>
        <textarea name="note" placeholder="Megjegyzés a rendeléshez" rows={4} />
      </div>
      <button className="btn btnPrimary" disabled={state === 'sending' || cart.items.length === 0}>
        {state === 'sending' ? 'Rendelés létrehozása…' : 'Rendelés leadása'}
      </button>
      {cart.items.length === 0 && <p className="notice">A kosár üres, ezért rendelés nem küldhető el.</p>}
      {state === 'error' && <p className="errorNotice">{error}</p>}
    </form>
  );
}
