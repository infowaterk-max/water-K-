'use client';

import { useEffect,useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { normalizeQuantity } from '@/lib/commerce/cart-engine';

type ReorderProduct={id:string;slug:string;name:string;grossPrice:number;sku:string;stock:number;minimumQuantity:number;orderMultiple:number};

export function ReorderLoader({products}:{products:ReorderProduct[]}){const params=useSearchParams(),{add}=useCart(),handled=useRef(false);useEffect(()=>{if(handled.current)return;const requested=params.getAll('sku');if(!requested.length)return;handled.current=true;for(const entry of requested){const split=entry.lastIndexOf(':');if(split<1)continue;const sku=entry.slice(0,split),requestedQuantity=Math.max(1,Math.min(99,Number.parseInt(entry.slice(split+1),10)||1)),product=products.find(item=>item.sku===sku);if(!product||product.stock<product.minimumQuantity)continue;const quantity=normalizeQuantity(requestedQuantity,product.stock,product.minimumQuantity,product.orderMultiple);if(quantity<product.minimumQuantity)continue;add({productId:product.id,variantId:product.id,slug:product.slug,name:product.name,unitPrice:product.grossPrice,quantity,minimumQuantity:product.minimumQuantity,orderMultiple:product.orderMultiple})}window.history.replaceState({},'',window.location.pathname)},[add,params,products]);return null}
