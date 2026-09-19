'use client';

import {useEffect,useState} from 'react';

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
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    localStorage.setItem('shoperation-cart-v4',JSON.stringify({items,couponCode:''}));
    for(const key of ['shoperation-cart-v3','shoperation-cart-v2','waterk-cart'])localStorage.removeItem(key);
    setReady(true);
  },[items]);

  return <section className="card">
    <span className="badge">Preview-only mixed cart</span>
    <h2>Interaktív pénztár teszt</h2>
    <p className="muted">A tesztkosár 1 fizikai és 1 digitális acceptance terméket tartalmaz. Nem hoz létre rendelést, amíg a pénztár végleges küldését nem indítod el.</p>
    <div className="actions">
      <a className="btn btnPrimary" href="/penztar">{ready?'Pénztár megnyitása':'Tesztkosár előkészítése…'}</a>
      <a className="btn btnGhost" href="/kosar">Kosár megnyitása</a>
    </div>
  </section>;
}
