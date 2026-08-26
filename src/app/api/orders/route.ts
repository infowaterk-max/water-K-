import { NextResponse } from 'next/server';
import { products } from '@/lib/catalog';
import type { CheckoutInput } from '@/lib/orders/types';

type CartItem = { productId: string; quantity: number };

export async function POST(request: Request) {
  const body = await request.json() as { checkout?: CheckoutInput; items?: CartItem[] };
  const checkout = body.checkout;
  const items = body.items;

  if (!checkout?.email || !checkout.name || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Hiányos rendelési adatok.' }, { status: 400 });
  }

  let total = 0;
  for (const item of items) {
    const product = products.find((entry) => entry.slug === item.productId);
    if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) {
      return NextResponse.json({ error: 'A kosár egyik tétele nem rendelhető a megadott mennyiségben.' }, { status: 409 });
    }
    total += product.grossPrice * item.quantity;
  }

  const orderNumber = `WK-${Date.now().toString().slice(-9)}`;

  // Staging: the validated order is returned to the client. Production persistence will use
  // a server-side Supabase client and a transaction before payment initialization.
  return NextResponse.json({
    ok: true,
    orderNumber,
    total,
    status: checkout.paymentMethod === 'kh_card' ? 'pending_payment' : 'pending_transfer',
    next: checkout.paymentMethod === 'kh_card' ? 'payment' : 'confirmation',
  }, { status: 201 });
}
