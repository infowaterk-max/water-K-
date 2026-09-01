'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Cart, CartItem } from '@/lib/cart/types';
import { cartTotal } from '@/lib/cart/types';
import { cartLineKey, mergeCartItem, normalizeQuantity } from '@/lib/commerce/cart-engine';

type CartContextValue = {
  cart: Cart;
  items: CartItem[];
  total: number;
  add: (item: CartItem) => void;
  remove: (productId: string, variantId?: string | null) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = 'shoperation-cart-v2';
const LEGACY_CART_STORAGE_KEY = 'waterk-cart';

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return typeof item.productId === 'string'
    && typeof item.slug === 'string'
    && typeof item.name === 'string'
    && typeof item.unitPrice === 'number'
    && Number.isFinite(item.unitPrice)
    && item.unitPrice >= 0
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && (item.variantId === undefined || item.variantId === null || typeof item.variantId === 'string');
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
    const current = localStorage.getItem(CART_STORAGE_KEY);
    const legacy = current ? null : localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    setCart(parseStoredCart(current ?? legacy));
    if (legacy) localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const api = useMemo<CartContextValue>(() => ({
    cart,
    items: cart.items,
    total: cartTotal(cart),
    add(item) {
      setCart((current) => ({ items: mergeCartItem(current.items, item) }));
    },
    remove(productId, variantId = null) {
      const key = cartLineKey({ productId, variantId });
      setCart((current) => ({ items: current.items.filter((item) => cartLineKey(item) !== key) }));
    },
    setQuantity(productId, quantity, variantId = null) {
      const key = cartLineKey({ productId, variantId });
      setCart((current) => ({
        items: current.items.map((item) => cartLineKey(item) === key
          ? { ...item, quantity: normalizeQuantity(quantity) }
          : item),
      }));
    },
    replace(items) {
      setCart({ items: items.filter(isCartItem) });
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
