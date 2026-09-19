'use client';

import Link from 'next/link';
import {useEffect,useRef} from 'react';
import {useCart} from '@/components/cart/cart-provider';

type AcceptanceCartItem={
  productId:string;
  variantId:string;
  slug:string;
  name:string;
  unitPrice:number;
  quantity:number;
  minimumQuantity?:number;
  orderMultiple?:number;
};

export function CheckoutAcceptanceSeeder({items}:{items:AcceptanceCartItem[]}){
  const{items:cartItems,replace,setCouponCode}=useCart();
  const seeded=useRef(false);

  useEffect(()=>{
    if(seeded.current)return;
    seeded.current=true;
    replace(items);
    setCouponCode('');
  },[items,replace,setCouponCode]);

  const ready=cartItems.length===items.length&&items.every(seed=>cartItems.some(item=>
    item.productId===seed.productId&&
    item.variantId===seed.variantId&&
    item.quantity===seed.quantity
  ));

  return <section className="card">
    <span className="badge">Preview-only mixed cart</span>
    <h2>Interaktív pénztár teszt</h2>
    <p className="muted">A tesztkosár 1 fizikai és 1 digitális acceptance terméket tartalmaz. Nem hoz létre rendelést, amíg a pénztár végleges küldését nem indítod el.</p>
    <div className="actions">
      <Link
        className="btn btnPrimary"
        href={ready?'/penztar':'#'}
        aria-disabled={!ready}
        onClick={event=>{if(!ready)event.preventDefault()}}
      >{ready?'Pénztár megnyitása':'Tesztkosár előkészítése…'}</Link>
      <Link className="btn btnGhost" href={ready?'/kosar':'#'} aria-disabled={!ready} onClick={event=>{if(!ready)event.preventDefault()}}>Kosár megnyitása</Link>
    </div>
  </section>;
}
