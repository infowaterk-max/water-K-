'use client';

import {useMemo,useState,type CSSProperties} from 'react';
import {useCart} from '@/components/cart/cart-provider';
import {useAnalytics} from '@/components/analytics/analytics-provider';
import {normalizeMinimumQuantity,normalizeOrderMultiple,normalizeQuantity} from '@/lib/commerce/cart-engine';

type Props={
  productId:string;
  variantId:string|null;
  slug:string;
  name:string;
  unitPrice:number;
  availableQuantity:number;
  minimumQuantity:number;
  orderMultiple:number;
  purchaseLabel:string;
  wishlistLabel:string;
  currency:string;
  wishlistActionHref?:string;
  styles?:Partial<Record<'root'|'quantity'|'step'|'value'|'purchase'|'wishlist',CSSProperties>>;
};

export function StorefrontPurchaseControlsClient({
  productId,variantId,slug,name,unitPrice,availableQuantity,minimumQuantity,orderMultiple,purchaseLabel,wishlistLabel,currency,wishlistActionHref='/api/storefront/wishlist',styles={},
}:Props){
  const{add}=useCart();
  const{track}=useAnalytics();
  const step=normalizeOrderMultiple(orderMultiple);
  const minimum=normalizeMinimumQuantity(minimumQuantity,step);
  const maximum=Math.max(0,Math.floor(availableQuantity));
  const canIdentify=Boolean(productId&&slug&&name&&Number.isFinite(unitPrice)&&unitPrice>=0);
  const purchasable=canIdentify&&maximum>=minimum;
  const initial=purchasable?normalizeQuantity(minimum,maximum,minimum,step):minimum;
  const[quantity,setQuantity]=useState(initial);
  const canWishlist=Boolean(variantId&&slug);
  const decrement=()=>setQuantity(current=>Math.max(minimum,normalizeQuantity(current-step,maximum,minimum,step)||minimum));
  const increment=()=>setQuantity(current=>normalizeQuantity(current+step,maximum,minimum,step)||current);
  const purchaseText=purchaseLabel||'Kosárba';
  const wishlistText=wishlistLabel||'Kedvencekhez';
  const rootStyle=useMemo<CSSProperties>(()=>({display:'grid',gridTemplateColumns:'5.4rem minmax(0,1fr) 2.9rem',gap:'.45rem',alignItems:'stretch',...styles.root}),[styles.root]);
  const quantityStyle=useMemo<CSSProperties>(()=>({display:'grid',gridTemplateColumns:'1.65rem 1fr 1.65rem',minHeight:'2.8rem',border:'1px solid var(--shoporation-color-border,#d8d8d8)',background:'var(--shoporation-color-background,#fff)',...styles.quantity}),[styles.quantity]);
  const stepStyle=useMemo<CSSProperties>(()=>({border:0,background:'transparent',color:'inherit',fontSize:'1rem',cursor:purchasable?'pointer':'default',padding:0,...styles.step}),[purchasable,styles.step]);
  const purchaseStyle=useMemo<CSSProperties>(()=>({border:'1px solid var(--shoporation-color-primary,#111)',background:'var(--shoporation-color-primary,#111)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:750,fontSize:'.72rem',letterSpacing:'.035em',padding:'.7rem .9rem',cursor:purchasable?'pointer':'default',opacity:1,...styles.purchase}),[purchasable,styles.purchase]);
  const wishlistStyle=useMemo<CSSProperties>(()=>({border:'1px solid var(--shoporation-color-border,#d8d8d8)',background:'var(--shoporation-color-background,#fff)',color:'var(--shoporation-color-text,#111)',fontSize:'1.1rem',padding:0,cursor:canWishlist?'pointer':'default',opacity:1,...styles.wishlist}),[canWishlist,styles.wishlist]);

  return <div data-storefront-commerce="purchase-controls" style={rootStyle}>
    <div aria-label="Mennyiség" style={quantityStyle}>
      <button type="button" aria-label="Mennyiség csökkentése" disabled={!purchasable||quantity<=minimum} onClick={decrement} style={stepStyle}>−</button>
      <output aria-live="polite" style={{display:'grid',placeItems:'center',fontSize:'.75rem',fontWeight:700,...styles.value}}>{quantity}</output>
      <button type="button" aria-label="Mennyiség növelése" disabled={!purchasable||quantity+step>maximum} onClick={increment} style={stepStyle}>+</button>
    </div>
    <button type="button" disabled={!purchasable} aria-disabled={!purchasable} style={purchaseStyle} onClick={()=>{
      if(!purchasable)return;
      add({productId,variantId,slug,name,unitPrice,quantity,minimumQuantity:minimum,orderMultiple:step});
      track('add_to_cart',{item_id:variantId??productId,item_name:name,value:unitPrice*quantity,currency,product_id:productId,variant_id:variantId??'',quantity});
    }}>{purchaseText}</button>
    <form action={wishlistActionHref} method="post" style={{display:'contents'}}>
      <input type="hidden" name="variantId" value={variantId??''}/>
      <input type="hidden" name="slug" value={slug}/>
      <button type="submit" disabled={!canWishlist} aria-disabled={!canWishlist} aria-label={wishlistText} title={wishlistText} style={wishlistStyle}>♡</button>
    </form>
  </div>;
}