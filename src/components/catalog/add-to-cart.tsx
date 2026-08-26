'use client';
import { useCart } from '@/components/cart/cart-provider';

type AddToCartProps = {
  id: string;
  slug: string;
  name: string;
  price: number;
};

export function AddToCart({ id, slug, name, price }: AddToCartProps) {
  const { add } = useCart();

  return (
    <button
      className="button"
      type="button"
      onClick={() => add({ productId: id, slug, name, unitPrice: price, quantity: 1 })}
    >
      Kosárba teszem
    </button>
  );
}
