'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { formatHuf } from '@/lib/catalog';
import { freeShippingThreshold, orderTotal, shippingFee, shippingOptions } from '@/lib/commerce/pricing';
import type { CustomerType, OrderStatus, ShippingMethod } from '@/lib/orders/types';

type OrderApiResponse = {
  error?: string;
  orderNumber?: string;
  status?: OrderStatus;
  total?: number;
};

export function CheckoutForm() {
  const { cart, total: subtotal, clear } = useCart();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('retail');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('foxpost');
  const companyRequired = customerType !== 'retail';
  const deliveryFee = shippingFee(shippingMethod, subtotal);
  const total = orderTotal(subtotal, shippingMethod);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');

    try {
      const formData = new FormData(event.currentTarget);
      const checkout = Object.fromEntries(formData.entries());
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ checkout, items: cart.items }),
      });

      const payload = await response.json() as OrderApiResponse;

      if (!response.ok || !payload.orderNumber || !payload.status) {
        setState('error');
        setError(payload.error ?? 'Nem sikerült létrehozni a rendelést.');
        return;
      }

      clear();
      const query = new URLSearchParams({
        order: payload.orderNumber,
        status: payload.status,
        total: String(payload.total ?? total),
      });
      router.push(`/rendeles-sikeres?${query.toString()}`);
    } catch {
      setState('error');
      setError('Hálózati hiba történt. A kosár tartalma megmaradt, próbáld újra.');
    }
  }

  return (
    <div className="checkoutLayout">
      <form className="checkout-form" onSubmit={submit}>
        <div className="checkoutHeading">
          <span className="eyebrow">Biztonságos rendelés</span>
          <h1>Pénztár</h1>
          <p className="muted">A rendelés összege szerveroldalon újraszámolódik, így a böngészőből küldött ár nem módosíthatja a végösszeget.</p>
        </div>

        <fieldset className="formSection">
          <legend>Kapcsolattartó és vásárlói típus</legend>
          <div className="form-grid">
            <input name="name" required placeholder="Név / kapcsolattartó" autoComplete="name" />
            <input name="email" required type="email" placeholder="E-mail" autoComplete="email" />
            <input name="phone" required placeholder="Telefonszám" autoComplete="tel" />
            <select
              name="customerType"
              value={customerType}
              onChange={(event) => setCustomerType(event.target.value as CustomerType)}
            >
              <option value="retail">Lakossági</option>
              <option value="company">Céges</option>
              <option value="reseller">Viszonteladó</option>
            </select>
            {companyRequired && <input name="companyName" required placeholder="Cégnév" autoComplete="organization" />}
            {companyRequired && <input name="taxNumber" required placeholder="Adószám" />}
          </div>
        </fieldset>

        <fieldset className="formSection">
          <legend>Számlázás és szállítás</legend>
          <div className="form-grid">
            <input name="billingAddress" required placeholder="Számlázási cím" autoComplete="billing street-address" />
            <input name="shippingAddress" required placeholder="Szállítási cím" autoComplete="shipping street-address" />
            <select
              name="shippingMethod"
              value={shippingMethod}
              onChange={(event) => setShippingMethod(event.target.value as ShippingMethod)}
            >
              {shippingOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <select name="paymentMethod" defaultValue="kh_card">
              <option value="kh_card">Bankkártya – K&H</option>
              <option value="bank_transfer">Banki átutalás</option>
            </select>
            {shippingMethod === 'foxpost' && (
              <input
                name="parcelPointId"
                required
                placeholder="Foxpost automata azonosító / választás"
                aria-describedby="parcel-help"
              />
            )}
            <textarea name="note" placeholder="Megjegyzés a rendeléshez" rows={4} />
          </div>
          {shippingMethod === 'foxpost' && <p id="parcel-help" className="helperText">Az éles Foxpost API bekötésekor ezt térképes automata-választó váltja fel.</p>}
        </fieldset>

        <button className="btn btnPrimary checkoutSubmit" disabled={state === 'sending' || cart.items.length === 0}>
          {state === 'sending' ? 'Rendelés létrehozása…' : `Rendelés leadása · ${formatHuf(total)}`}
        </button>
        {cart.items.length === 0 && <p className="notice">A kosár üres, ezért rendelés nem küldhető el.</p>}
        {state === 'error' && <p className="errorNotice">{error}</p>}
      </form>

      <aside className="checkoutSummary card">
        <span className="eyebrow">Rendelésed</span>
        <h2>Összesítő</h2>
        <div className="summaryItems">
          {cart.items.map((item) => (
            <div className="summaryLine" key={item.productId}>
              <span>{item.name} × {item.quantity}</span>
              <strong>{formatHuf(item.unitPrice * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="summaryLine"><span>Termékek</span><strong>{formatHuf(subtotal)}</strong></div>
        <div className="summaryLine"><span>Szállítás</span><strong>{deliveryFee === 0 ? 'Díjmentes' : formatHuf(deliveryFee)}</strong></div>
        <div className="summaryTotal"><span>Fizetendő</span><strong>{formatHuf(total)}</strong></div>
        {subtotal < freeShippingThreshold && shippingMethod !== 'pickup' && (
          <p className="shippingProgress">Még {formatHuf(freeShippingThreshold - subtotal)} a díjmentes szállításhoz.</p>
        )}
        <div className="trustList">
          <span>✓ Szerveroldali árvalidáció</span>
          <span>✓ Biztonságos fizetési adapter</span>
          <span>✓ A kosár hiba esetén megmarad</span>
        </div>
      </aside>
    </div>
  );
}
