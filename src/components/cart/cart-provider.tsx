'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Cart, CartItem } from '@/lib/cart/types';
import { cartTotal } from '@/lib/cart/types';

type CartContextValue = {
  cart: Cart;
  items: CartItem[];
  total: number;
  add: (item: CartItem) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [] });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('waterk-cart');
      if (saved) setCart(JSON.parse(saved) as Cart);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('waterk-cart', JSON.stringify(cart));
  }, [cart]);

  const api = useMemo<CartContextValue>(() => ({
    cart,
    items: cart.items,
    total: cartTotal(cart),
    add(item) {
      setCart((current) => ({
        items: current.items.some((x) => x.productId === item.productId)
          ? current.items.map((x) =>
              x.productId === item.productId
                ? { ...x, quantity: x.quantity + item.quantity }
                : x,
            )
          : [...current.items, item],
      }));
    },
    remove(productId) {
      setCart((current) => ({
        items: current.items.filter((x) => x.productId !== productId),
      }));
    },
    setQuantity(productId, quantity) {
      const safeQuantity = Math.max(1, Math.floor(quantity || 1));
      setCart((current) => ({
        items: current.items.map((x) =>
          x.productId === productId ? { ...x, quantity: safeQuantity } : x,
        ),
      }));
    },
    clear() {
      setCart({ items: [] });
    },
  }), [cart]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}
