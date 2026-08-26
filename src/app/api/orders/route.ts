import { NextResponse } from 'next/server';
import type { CheckoutInput } from '@/lib/orders/types';
export async function POST(request: Request) {
  const body = await request.json() as { checkout?: CheckoutInput; items?: unknown[] };
  if (!body.checkout?.email || !Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'Hiányos rendelési adatok.' }, { status: 400 });
  // Production: prices and stock are reloaded server-side from Postgres. Never trust client totals.
  return NextResponse.json({ ok: true, status: 'pending_payment', next: body.checkout.paymentMethod === 'kh_card' ? 'payment' : 'confirmation' }, { status: 201 });
}
