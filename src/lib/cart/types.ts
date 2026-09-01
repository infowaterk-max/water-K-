export type CartItem = {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
};

export type Cart = { items: CartItem[] };

export const cartTotal = (cart: Cart) =>
  cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
