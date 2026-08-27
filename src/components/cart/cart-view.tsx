'use client';

import Link from 'next/link';
import { useCart } from './cart-provider';
import { formatHuf } from '@/lib/catalog';
import { freeShippingThreshold } from '@/lib/commerce/pricing';

export function CartView() {
  const { items, total, setQuantity, remove } = useCart();

  if (!items.length) {
    return (
      <div className="emptyCart card">
        <span className="eyebrow">A kosár üres</span>
        <h2>Még nincs benne Water-K.</h2>
        <p className="muted">Válassz kiszerelést, a kosár pedig ezen az eszközön megmarad, amíg be nem fejezed a vásárlást.</p>
        <Link className="btn btnPrimary" href="/webaruhaz">Irány a webáruház</Link>
      </div>
    );
  }

  const remaining = Math.max(0, freeShippingThreshold - total);

  return (
    <div className="cartGrid">
      <section className="card cartItemsCard">
        <div className="cartHeader"><div><span className="eyebrow">Kosár</span><h2>{items.length} féle termék</h2></div><span className="badge">Helyben mentve</span></div>
        {items.map((item) => (
          <div className="cartRow" key={item.productId}>
            <div className="cartProductIdentity">
              <div className="cartThumb">WK</div>
              <div><strong>{item.name}</strong><p>{formatHuf(item.unitPrice)} / db</p></div>
            </div>
            <label className="quantityControl"><span className="srOnly">Mennyiség</span><input aria-label="Mennyiség" type="number" min="1" value={item.quantity} onChange={(event) => setQuantity(item.productId, Number(event.target.value))} /></label>
            <div className="cartLineTotal"><strong>{formatHuf(item.unitPrice * item.quantity)}</strong><button onClick={() => remove(item.productId)}>Törlés</button></div>
          </div>
        ))}
        <Link className="textLink" href="/webaruhaz">← További termék hozzáadása</Link>
      </section>

      <aside className="card cartSummaryCard">
        <span className="eyebrow">Összesítés</span>
        <h2>Részösszeg</h2>
        <div className="summaryTotal"><span>Termékek</span><strong>{formatHuf(total)}</strong></div>
        <p className="muted">A végleges szállítási díjat a pénztárban, a választott módtól függően számítjuk.</p>
        {remaining > 0 ? <p className="shippingProgress">Még {formatHuf(remaining)} a díjmentes szállítási küszöbig.</p> : <p className="shippingProgress">Elérted a díjmentes szállítási küszöböt.</p>}
        <Link className="btn btnPrimary cartCheckoutButton" href="/penztar">Tovább a pénztárhoz</Link>
        <div className="trustList"><span>✓ Az árakat a szerver újraellenőrzi</span><span>✓ K&H fizetési adapterre előkészítve</span><span>✓ Futár API-k közvetlen bekötésére kész</span></div>
      </aside>
    </div>
  );
}
