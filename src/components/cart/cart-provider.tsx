'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Cart, CartItem } from '@/lib/cart/types';
const CartContext = createContext<any>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [] });
  useEffect(() => { try { const saved = localStorage.getItem('waterk-cart'); if (saved) setCart(JSON.parse(saved)); } catch {} }, []);
  useEffect(() => { localStorage.setItem('waterk-cart', JSON.stringify(cart)); }, [cart]);
  const api = useMemo(() => ({ cart, add(item: CartItem) { setCart(c => ({ items: c.items.some(x=>x.productId===item.productId) ? c.items.map(x=>x.productId===item.productId?{...x,quantity:x.quantity+item.quantity}:x) : [...c.items,item] })); }, remove(productId:string){setCart(c=>({items:c.items.filter(x=>x.productId!==productId)}));}, clear(){setCart({items:[]});} }), [cart]);
  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
