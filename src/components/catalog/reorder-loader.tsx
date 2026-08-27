'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';

type ReorderProduct={id:string;slug:string;name:string;grossPrice:number;sku:string;stock:number};

export function ReorderLoader({products}:{products:ReorderProduct[]}){
  const params=useSearchParams();
  const {add}=useCart();
  const handled=useRef(false);
  useEffect(()=>{
    if(handled.current)return;
    const requested=params.getAll('sku');
    if(!requested.length)return;
    handled.current=true;
    for(const entry of requested){
      const split=entry.lastIndexOf(':');
      if(split<1)continue;
      const sku=entry.slice(0,split); const quantity=Math.max(1,Math.min(99,Number.parseInt(entry.slice(split+1),10)||1));
      const product=products.find(item=>item.sku===sku);
      if(!product||product.stock<=0)continue;
      add({productId:product.id,slug:product.slug,name:product.name,unitPrice:product.grossPrice,quantity:Math.min(quantity,product.stock)});
    }
    window.history.replaceState({},'',window.location.pathname);
  },[add,params,products]);
  return null;
}
