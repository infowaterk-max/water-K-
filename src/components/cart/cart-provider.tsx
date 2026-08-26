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

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return typeof item.productId === 'string'
    && typeof item.slug === 'string'
    && typeof item.name === 'string'
    && typeof item.unitPrice === 'number'
    && Number.isFinite(item.unitPrice)
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0;
}

function parseStoredCart(value: string | null): Cart {
  if (!value) return { items: [] };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return { items: [] };
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return { items: [] };
    return { items: items.filter(isCartItem) };
  } catch {
    return { items: [] };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(parseStoredCart(localStorage.getItem('waterk-cart')));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('waterk-cart', JSON.stringify(cart));
  }, [cart, hydrated]);

  const api = useMemo<CartContextValue>(() => ({
    cart,
    items: cart.items,
    total: cartTotal(cart),
    add(item) {
      setCart((current) => ({
        items: current.items.some((existing) => existing.productId === item.productId)
          ? current.items.map((existing) =>
              existing.productId === item.productId
                ? { ...existing, quantity: existing.quantity + item.quantity }
                : existing,
            )
          : [...current.items, item],
      }));
    },
    remove(productId) {
      setCart((current) => ({
        items: current.items.filter((item) => item.productId !== productId),
      }));
    },
    setQuantity(productId, quantity) {
      const safeQuantity = Math.max(1, Math.floor(quantity || 1));
      setCart((current) => ({
        items: current.items.map((item) =>
          item.productId === productId ? { ...item, quantity: safeQuantity } : item,
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
