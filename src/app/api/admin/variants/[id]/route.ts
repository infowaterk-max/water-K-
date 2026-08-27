import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  stock: z.number().int().min(0).max(100000).optional(),
  grossPrice: z.number().int().min(0).max(10000000).optional(),
  netPrice: z.number().int().min(0).max(10000000).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Nincs módosítás.');

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Érvénytelen változatazonosító.' }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Érvénytelen termékadat.' }, { status: 400 });
  const update: Record<string, unknown> = {};
  if (parsed.data.stock !== undefined) update.stock_quantity = parsed.data.stock;
  if (parsed.data.grossPrice !== undefined) update.gross_price_huf = parsed.data.grossPrice;
  if (parsed.data.netPrice !== undefined) update.net_price_huf = parsed.data.netPrice;
  if (parsed.data.active !== undefined) update.active = parsed.data.active;
  const admin = createAdminClient();
  const { error } = await admin.from('product_variants').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: 'A termék módosítása nem sikerült.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
