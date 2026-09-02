'use client';
import { useCart } from '@/components/cart/cart-provider';
import { useAnalytics } from '@/components/analytics/analytics-provider';
import { normalizeMinimumQuantity } from '@/lib/commerce/cart-engine';

type AddToCartProps={id:string;variantId?:string|null;slug:string;name:string;price:number;availableQuantity:number;minimumQuantity?:number;orderMultiple?:number};

export function AddToCart({id,variantId=null,slug,name,price,availableQuantity,minimumQuantity=1,orderMultiple=1}:AddToCartProps){
  const{add}=useCart(),{track}=useAnalytics(),minimum=normalizeMinimumQuantity(minimumQuantity,orderMultiple),purchasable=availableQuantity>=minimum;
  return <button className="button" type="button" disabled={!purchasable} onClick={()=>{if(!purchasable)return;add({productId:id,variantId,slug,name,unitPrice:price,quantity:minimum,minimumQuantity:minimum,orderMultiple});track('add_to_cart',{item_id:variantId??id,item_name:name,value:price*minimum,currency:'HUF',product_id:id,variant_id:variantId??'',quantity:minimum});}}>{purchasable?'Kosárba teszem':'Nincs elegendő készlet'}</button>;
}
