'use client';
import { useCart } from '@/components/cart/cart-provider';

export function AddToCart({id,name,price}:{id:string;name:string;price:number}){const {add}=useCart();return <button className="button" onClick={()=>add({productId:id,name,unitPrice:price,quantity:1})}>Kosárba teszem</button>}
