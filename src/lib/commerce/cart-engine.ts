import type { Cart, CartItem } from '@/lib/cart/types';

export type CommerceQuote = {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  unitPrice: number;
  availableQuantity: number;
  purchasable: boolean;
  image?: string;
};

export type CartValidationIssue = {
  productId: string;
  code: 'unavailable' | 'price_changed' | 'quantity_reduced' | 'missing';
  message: string;
};

export type CartValidationResult = {
  cart: Cart;
  issues: CartValidationIssue[];
  changed: boolean;
};

export const cartLineKey = (item: Pick<CartItem, 'productId' | 'variantId'>) =>
  `${item.productId}:${item.variantId ?? 'default'}`;

export function normalizeQuantity(value: number, max?: number) {
  const quantity = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
  return typeof max === 'number' ? Math.min(quantity, Math.max(0, Math.floor(max))) : quantity;
}

export function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    unitPrice: Math.max(0, Number.isFinite(item.unitPrice) ? item.unitPrice : 0),
    quantity: normalizeQuantity(item.quantity),
  };
}

export function mergeCartItem(items: CartItem[], incoming: CartItem): CartItem[] {
  const normalized = normalizeCartItem(incoming);
  const key = cartLineKey(normalized);
  const existing = items.find((item) => cartLineKey(item) === key);
  if (!existing) return [...items, normalized];
  return items.map((item) => cartLineKey(item) === key
    ? { ...item, quantity: normalizeQuantity(item.quantity + normalized.quantity) }
    : item);
}

export function validateCartAgainstQuotes(cart: Cart, quotes: CommerceQuote[]): CartValidationResult {
  const quoteMap = new Map(quotes.map((quote) => [`${quote.productId}:${quote.variantId ?? 'default'}`, quote]));
  const issues: CartValidationIssue[] = [];
  const items: CartItem[] = [];

  for (const item of cart.items) {
    const quote = quoteMap.get(cartLineKey(item));
    if (!quote) {
      issues.push({ productId: item.productId, code: 'missing', message: `${item.name} már nem található a katalógusban.` });
      continue;
    }
    if (!quote.purchasable || quote.availableQuantity < 1) {
      issues.push({ productId: item.productId, code: 'unavailable', message: `${quote.name} jelenleg nem rendelhető.` });
      continue;
    }

    let quantity = normalizeQuantity(item.quantity, quote.availableQuantity);
    if (quantity !== item.quantity) {
      issues.push({ productId: item.productId, code: 'quantity_reduced', message: `${quote.name} mennyiségét az elérhető készlethez igazítottuk.` });
    }
    if (quote.unitPrice !== item.unitPrice) {
      issues.push({ productId: item.productId, code: 'price_changed', message: `${quote.name} ára megváltozott; a kosarat az aktuális árra frissítettük.` });
    }
    if (quantity > 0) {
      items.push({
        ...item,
        slug: quote.slug,
        name: quote.name,
        unitPrice: quote.unitPrice,
        quantity,
        image: quote.image ?? item.image,
      });
    }
  }

  return { cart: { items }, issues, changed: issues.length > 0 };
}
