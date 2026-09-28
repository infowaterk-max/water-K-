'use client';

import {useState,type CSSProperties} from 'react';
import {useCart} from '@/components/cart/cart-provider';
import {useAnalytics} from '@/components/analytics/analytics-provider';
import {AddToCartConfirmation} from '@/components/cart/add-to-cart-confirmation';
import {normalizeMinimumQuantity,normalizeOrderMultiple} from '@/lib/commerce/cart-engine';

type Props={
  productId:string;
  variantId:string|null;
  slug:string;
  name:string;
  unitPrice:number;
  availableQuantity:number;
  minimumQuantity:number;
  orderMultiple:number;
  currency:string;
  label:string;
  style?:CSSProperties;
};

export function StorefrontProductCardAddToCartClient({
  productId,variantId,slug,name,unitPrice,availableQuantity,minimumQuantity,orderMultiple,currency,label,style,
}:Props){
  const{add}=useCart();
  const{track}=useAnalytics();
  const[open,setOpen]=useState(false);
  const step=normalizeOrderMultiple(orderMultiple);
  const quantity=normalizeMinimumQuantity(minimumQuantity,step);
  const purchasable=Boolean(productId&&slug&&name&&Number.isFinite(unitPrice)&&unitPrice>=0&&availableQuantity>=quantity);
  return <>
    <button
      type="button"
      data-storefront-product-card-add-to-cart="true"
      disabled={!purchasable}
      aria-disabled={!purchasable}
      style={{marginTop:'auto',display:'inline-flex',justifyContent:'center',padding:'.62rem .75rem',border:'1px solid var(--shoporation-color-primary,#111)',background:'var(--shoporation-color-primary,#111)',color:'var(--shoporation-color-primary-contrast,#fff)',fontSize:'.72rem',fontWeight:700,cursor:purchasable?'pointer':'not-allowed',opacity:purchasable?1:.55,...style}}
      onClick={()=>{
        if(!purchasable)return;
        add({productId,variantId,slug,name,unitPrice,quantity,minimumQuantity:quantity,orderMultiple:step});
        track('add_to_cart',{item_id:variantId??productId,item_name:name,value:unitPrice*quantity,currency,product_id:productId,variant_id:variantId??'',quantity});
        setOpen(true);
      }}
    >{label||'Kosárba'}</button>
    <AddToCartConfirmation open={open} productName={name} onClose={()=>setOpen(false)}/>
  </>;
}
