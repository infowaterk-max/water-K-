import { describe, expect, it } from 'vitest';
import { mergeCartItem, validateCartAgainstQuotes } from '../src/lib/commerce/cart-engine';

describe('Core Commerce Engine cart contracts', () => {
  it('keeps variants as separate cart lines', () => {
    const first = { productId: 'p1', variantId: 'v1', slug: 'termek', name: 'Termék S', unitPrice: 1000, quantity: 1 };
    const second = { productId: 'p1', variantId: 'v2', slug: 'termek', name: 'Termék L', unitPrice: 1200, quantity: 1 };
    expect(mergeCartItem([first], second)).toHaveLength(2);
  });

  it('merges the same product variant', () => {
    const item = { productId: 'p1', variantId: 'v1', slug: 'termek', name: 'Termék', unitPrice: 1000, quantity: 1 };
    expect(mergeCartItem([item], { ...item, quantity: 2 })[0].quantity).toBe(3);
  });

  it('re-prices and caps quantity from authoritative commerce quotes', () => {
    const result = validateCartAgainstQuotes({ items: [
      { productId: 'p1', variantId: 'v1', slug: 'termek', name: 'Régi név', unitPrice: 1000, quantity: 5 },
    ] }, [
      { productId: 'p1', variantId: 'v1', slug: 'termek', name: 'Termék', unitPrice: 1250, availableQuantity: 2, purchasable: true },
    ]);
    expect(result.changed).toBe(true);
    expect(result.cart.items[0]).toMatchObject({ unitPrice: 1250, quantity: 2, name: 'Termék' });
    expect(result.issues.map((issue) => issue.code)).toEqual(['quantity_reduced', 'price_changed']);
  });

  it('removes unavailable catalogue lines', () => {
    const result = validateCartAgainstQuotes({ items: [
      { productId: 'p1', slug: 'termek', name: 'Termék', unitPrice: 1000, quantity: 1 },
    ] }, [
      { productId: 'p1', slug: 'termek', name: 'Termék', unitPrice: 1000, availableQuantity: 0, purchasable: false },
    ]);
    expect(result.cart.items).toEqual([]);
    expect(result.issues[0].code).toBe('unavailable');
  });
});
