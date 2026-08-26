import { NextResponse } from 'next/server';
import { z } from 'zod';
import { products } from '@/lib/catalog';
import type { OrderStatus } from '@/lib/orders/types';

const checkoutSchema = z.object({
  customerType: z.enum(['retail', 'company', 'reseller']),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(40),
  companyName: z.string().trim().max(200).optional(),
  taxNumber: z.string().trim().max(40).optional(),
  billingAddress: z.string().trim().min(5).max(500),
  shippingAddress: z.string().trim().min(5).max(500),
  shippingMethod: z.enum(['foxpost', 'gls', 'mpl', 'pickup']),
  paymentMethod: z.enum(['kh_card', 'bank_transfer']),
  parcelPointId: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
});

const orderRequestSchema = z.object({
  checkout: checkoutSchema,
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().max(999),
  })).min(1).max(50),
});

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Érvénytelen JSON kérés.' }, { status: 400 });
  }

  const parsed = orderRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Hiányos vagy érvénytelen rendelési adatok.' }, { status: 400 });
  }

  const { checkout, items } = parsed.data;

  if (checkout.customerType !== 'retail' && (!checkout.companyName || !checkout.taxNumber)) {
    return NextResponse.json({ error: 'Céges vagy viszonteladói rendeléshez cégnév és adószám szükséges.' }, { status: 400 });
  }

  let total = 0;
  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product || item.quantity > product.stock) {
      return NextResponse.json({ error: 'A kosár egyik tétele nem rendelhető a megadott mennyiségben.' }, { status: 409 });
    }
    total += product.grossPrice * item.quantity;
  }

  const orderNumber = `WK-${Date.now().toString().slice(-9)}`;
  const status: OrderStatus = checkout.paymentMethod === 'kh_card' ? 'pending_payment' : 'pending_transfer';

  // Staging: the validated order is returned to the client. Production persistence will use
  // a server-side Supabase client and a transaction before payment initialization.
  return NextResponse.json({
    ok: true,
    orderNumber,
    total,
    status,
    next: checkout.paymentMethod === 'kh_card' ? 'payment' : 'confirmation',
  }, { status: 201 });
}
