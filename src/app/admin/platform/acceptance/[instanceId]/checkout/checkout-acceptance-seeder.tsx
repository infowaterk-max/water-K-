'use client';

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
  const{items:cartItems,replace,setCouponCode,hydrated}=useCart();
  const seeded=useRef(false);

  useEffect(()=>{
    if(!hydrated||seeded.current)return;
    seeded.current=true;
    replace(items);
    setCouponCode('');
  },[hydrated,items,replace,setCouponCode]);

  const ready=hydrated&&cartItems.length===items.length&&items.every(seed=>cartItems.some(item=>
    item.productId===seed.productId&&
    item.variantId===seed.variantId&&
    item.quantity===seed.quantity
  ));

  const open=(href:'/penztar'|'/kosar')=>{
    if(!ready)return;
    window.location.assign(href);
  };

  return <section className="card">
    <span className="badge">Preview-only mixed cart</span>
    <h2>Interaktív pénztár teszt</h2>
    <p className="muted">A tesztkosár 1 fizikai és 1 digitális acceptance terméket tartalmaz. Nem hoz létre rendelést, amíg a pénztár végleges küldését nem indítod el.</p>
    <div className="actions">
      <button
        className="btn btnPrimary"
        type="button"
        disabled={!ready}
        aria-disabled={!ready}
        onClick={()=>open('/penztar')}
      >{ready?'Pénztár megnyitása':'Tesztkosár előkészítése…'}</button>
      <button className="btn btnGhost" type="button" disabled={!ready} aria-disabled={!ready} onClick={()=>open('/kosar')}>Kosár megnyitása</button>
    </div>
  </section>;
}
