'use client';
import { useCart } from '@/components/cart/cart-provider';
import { useAnalytics } from '@/components/analytics/analytics-provider';

type AddToCartProps = {
  id: string;
  variantId?: string | null;
  slug: string;
  name: string;
  price: number;
};

export function AddToCart({ id, variantId = null, slug, name, price }: AddToCartProps) {
  const { add } = useCart();
  const { track } = useAnalytics();

  return (
    <button
      className="button"
      type="button"
      onClick={() => {
        add({ productId: id, variantId, slug, name, unitPrice: price, quantity: 1 });
        track('add_to_cart', {
          item_id: variantId ?? id,
          item_name: name,
          value: price,
          currency: 'HUF',
          product_id: id,
          variant_id: variantId ?? '',
        });
      }}
    >
      Kosárba teszem
    </button>
  );
}
