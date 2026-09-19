'use client';

import { createContext,useContext,useEffect,useMemo,useState } from 'react';
import type { Cart,CartCommerceGroupMeta,CartCommerceGroupType,CartItem } from '@/lib/cart/types';
import { cartTotal } from '@/lib/cart/types';
import { cartLineKey,mergeCartItem,normalizeCartItem,normalizeQuantity } from '@/lib/commerce/cart-engine';

type CartContextValue={
 cart:Cart;items:CartItem[];total:number;couponCode:string;
 add:(item:CartItem)=>void;addMany:(items:readonly CartItem[])=>void;
 setCouponCode:(code:string)=>void;
 remove:(productId:string,variantId?:string|null,lineId?:string)=>void;
 setQuantity:(productId:string,quantity:number,variantId?:string|null,lineId?:string)=>void;
 replace:(items:CartItem[])=>void;clear:()=>void;
 removeCommerceGroup:(type:CartCommerceGroupType,id:string)=>void;
 replaceCommerceGroup:(type:CartCommerceGroupType,id:string,items:readonly CartItem[])=>void;
};
const CartContext=createContext<CartContextValue|null>(null),CART_STORAGE_KEY='shoperation-cart-v4',LEGACY_CART_STORAGE_KEYS=['shoperation-cart-v3','shoperation-cart-v2','waterk-cart'] as const;
const GROUP_KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;const ITEM_KEY=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function isGroup(value:unknown):value is CartCommerceGroupMeta{if(!value||typeof value!=='object'||Array.isArray(value))return false;const group=value as Partial<CartCommerceGroupMeta>;return(group.type==='composition'||group.type==='configuration')&&typeof group.id==='string'&&GROUP_KEY.test(group.id)&&typeof group.engineVersion==='string'&&group.engineVersion.length>0&&group.engineVersion.length<=160&&typeof group.definitionKey==='string'&&GROUP_KEY.test(group.definitionKey)&&Number.isInteger(group.definitionVersion)&&Number(group.definitionVersion)>=1&&Number(group.definitionVersion)<=1000&&typeof group.itemKey==='string'&&ITEM_KEY.test(group.itemKey)&&(group.slotId===undefined||group.slotId===null||(typeof group.slotId==='string'&&GROUP_KEY.test(group.slotId)))}
function isCartItem(value:unknown):value is CartItem{if(!value||typeof value!=='object')return false;const item=value as Partial<CartItem>;return typeof item.productId==='string'&&typeof item.slug==='string'&&typeof item.name==='string'&&typeof item.unitPrice==='number'&&Number.isFinite(item.unitPrice)&&item.unitPrice>=0&&typeof item.quantity==='number'&&Number.isInteger(item.quantity)&&item.quantity>0&&(item.variantId===undefined||item.variantId===null||typeof item.variantId==='string')&&(item.minimumQuantity===undefined||(Number.isInteger(item.minimumQuantity)&&item.minimumQuantity>0))&&(item.orderMultiple===undefined||(Number.isInteger(item.orderMultiple)&&item.orderMultiple>0))&&(item.lineId===undefined||(typeof item.lineId==='string'&&item.lineId.length>0&&item.lineId.length<=240))&&(item.commerceGroup===undefined||isGroup(item.commerceGroup))}
function normalizeCouponCode(value:unknown){return typeof value==='string'?value.trim().toUpperCase().slice(0,32):''}
function parseStoredCart(value:string|null):Cart{if(!value)return{items:[],couponCode:''};try{const parsed:unknown=JSON.parse(value);if(!parsed||typeof parsed!=='object')return{items:[],couponCode:''};const source=parsed as{items?:unknown;couponCode?:unknown},items=source.items;if(!Array.isArray(items))return{items:[],couponCode:normalizeCouponCode(source.couponCode)};return{items:items.filter(isCartItem).map(normalizeCartItem),couponCode:normalizeCouponCode(source.couponCode)}}catch{return{items:[],couponCode:''}}}
const groupMatch=(item:CartItem,type:CartCommerceGroupType,id:string)=>item.commerceGroup?.type===type&&item.commerceGroup.id===id;

export function CartProvider({children}:{children:React.ReactNode}){const[cart,setCart]=useState<Cart>({items:[],couponCode:''}),[hydrated,setHydrated]=useState(false);
 useEffect(()=>{const current=localStorage.getItem(CART_STORAGE_KEY);let stored=current;if(!stored)for(const key of LEGACY_CART_STORAGE_KEYS){stored=localStorage.getItem(key);if(stored)break;}setCart(parseStoredCart(stored));for(const key of LEGACY_CART_STORAGE_KEYS)localStorage.removeItem(key);setHydrated(true)},[]);
 useEffect(()=>{if(!hydrated)return;localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(cart))},[cart,hydrated]);
 const api=useMemo<CartContextValue>(()=>({cart,items:cart.items,total:cartTotal(cart),couponCode:cart.couponCode??'',add(item){setCart(current=>({...current,items:mergeCartItem(current.items,item)}))},addMany(items){setCart(current=>({...current,items:items.filter(isCartItem).reduce((next,item)=>mergeCartItem(next,item),current.items)}))},setCouponCode(code){setCart(current=>({...current,couponCode:normalizeCouponCode(code)}))},remove(productId,variantId=null,lineId){const key=lineId?`line:${lineId}`:cartLineKey({productId,variantId});setCart(current=>({...current,items:current.items.filter(item=>cartLineKey(item)!==key)}))},setQuantity(productId,quantity,variantId=null,lineId){const key=lineId?`line:${lineId}`:cartLineKey({productId,variantId});setCart(current=>({...current,items:current.items.map(item=>cartLineKey(item)===key?{...item,quantity:normalizeQuantity(quantity,undefined,item.minimumQuantity??1,item.orderMultiple??1)}:item)}))},replace(items){setCart(current=>({...current,items:items.filter(isCartItem).map(normalizeCartItem)}))},clear(){setCart({items:[],couponCode:''})},removeCommerceGroup(type,id){setCart(current=>({...current,items:current.items.filter(item=>!groupMatch(item,type,id))}))},replaceCommerceGroup(type,id,items){setCart(current=>({...current,items:items.filter(isCartItem).reduce((next,item)=>mergeCartItem(next,item),current.items.filter(item=>!groupMatch(item,type,id))) }))}}),[cart]);
 return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}
export function useCart():CartContextValue{const value=useContext(CartContext);if(!value)throw new Error('useCart must be used within CartProvider');return value}
