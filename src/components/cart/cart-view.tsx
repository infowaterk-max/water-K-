'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from './cart-provider';
import { formatHuf } from '@/lib/catalog';
import { freeShippingApplies } from '@/lib/commerce/pricing';
import { cartLineKey,normalizeQuantity } from '@/lib/commerce/cart-engine';

type CartViewProps={freeShippingThreshold:number;products:Array<{id:string;name:string;slug:string;grossPrice:number;minimumQuantity:number;orderMultiple:number}>};

export function CartView({freeShippingThreshold,products}:CartViewProps){
  const{items,total,setQuantity,remove,replace}=useCart();
  useEffect(()=>{
    if(!items.length)return;
    const byId=new Map(products.map(product=>[product.id,product]));
    let changed=false;
    const next=items.map(item=>{
      const current=byId.get(item.variantId??item.productId);
      if(!current)return item;
      const quantity=normalizeQuantity(item.quantity,undefined,current.minimumQuantity,current.orderMultiple);
      if(item.minimumQuantity!==current.minimumQuantity||item.orderMultiple!==current.orderMultiple||item.unitPrice!==current.grossPrice||item.name!==current.name||item.slug!==current.slug||item.quantity!==quantity)changed=true;
      return{...item,name:current.name,slug:current.slug,unitPrice:current.grossPrice,minimumQuantity:current.minimumQuantity,orderMultiple:current.orderMultiple,quantity};
    });
    if(changed)replace(next);
  },[items,products,replace]);

  if(!items.length)return <div className="emptyCart card"><span className="eyebrow">A kosár üres</span><h2>Még nincs termék a kosaradban.</h2><p className="muted">Válassz terméket, a kosár pedig ezen az eszközön megmarad, amíg be nem fejezed a vásárlást.</p><Link className="btn btnPrimary" href="/webaruhaz">Irány a webáruház</Link></div>;
  const hasFreeShippingThreshold=freeShippingThreshold>0,freeShippingReached=freeShippingApplies(total,freeShippingThreshold),remaining=hasFreeShippingThreshold?Math.max(0,freeShippingThreshold-total):0;
  return <div className="cartGrid"><section className="card cartItemsCard"><div className="cartHeader"><div><span className="eyebrow">Kosár</span><h2>{items.length} féle termék</h2></div><span className="badge">Helyben mentve</span></div>
    {items.map(item=>{const minimum=item.minimumQuantity??1,multiple=item.orderMultiple??1;const canDecrease=item.quantity>minimum;return <div className="cartRow" key={cartLineKey(item)}><div className="cartProductIdentity"><div className="cartThumb">{item.name.trim().slice(0,2).toUpperCase()||'•'}</div><div><strong>{item.name}</strong><p>{formatHuf(item.unitPrice)} / db</p><small className="cartRuleText">Minimum: {minimum} db · rendelési egység: {multiple} db</small></div></div><div className="cartQuantityStepper" role="group" aria-label={`${item.name} mennyiségének módosítása`}><button type="button" aria-label="Mennyiség csökkentése" disabled={!canDecrease} onClick={()=>setQuantity(item.productId,item.quantity-multiple,item.variantId)}>−</button><input aria-label="Mennyiség" type="number" min={minimum} step={multiple} value={item.quantity} onChange={event=>setQuantity(item.productId,Number(event.target.value),item.variantId)}/><button type="button" aria-label="Mennyiség növelése" onClick={()=>setQuantity(item.productId,item.quantity+multiple,item.variantId)}>+</button></div><div className="cartLineTotal"><strong>{formatHuf(item.unitPrice*item.quantity)}</strong><button onClick={()=>remove(item.productId,item.variantId)}>Törlés</button></div></div>})}
    <Link className="textLink" href="/webaruhaz">← További termék hozzáadása</Link></section>
    <aside className="card cartSummaryCard"><span className="eyebrow">Összesítés</span><h2>Részösszeg</h2><div className="summaryTotal"><span>Termékek</span><strong>{formatHuf(total)}</strong></div><p className="muted">A végleges árat, készletet, kedvezményt és szállítási díjat a pénztárban a szerver ellenőrzi.</p>{hasFreeShippingThreshold?(remaining>0?<p className="shippingProgress">Még {formatHuf(remaining)} a díjmentes szállítási küszöbig.</p>:freeShippingReached?<p className="shippingProgress">Elérted a díjmentes szállítási küszöböt.</p>:null):null}<Link className="btn btnPrimary cartCheckoutButton" href="/penztar">Tovább a pénztárhoz</Link><div className="trustList"><span>✓ Az árakat és a készletet a szerver újraellenőrzi</span><span>✓ Csak az adott webshop aktív fizetési módjai használhatók</span><span>✓ Csak az adott webshop aktív szállítási módjai használhatók</span></div></aside></div>;
}
