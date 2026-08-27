import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  status: z.enum(['draft','pending','paid','processing','shipped','completed','cancelled','refunded']),
  trackingNumber: z.string().trim().max(120).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Érvénytelen rendelésazonosító.' }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Érvénytelen rendelési állapot.' }, { status: 400 });

  const admin = createAdminClient();
  const update: Record<string, unknown> = { status: parsed.data.status, updated_at: new Date().toISOString() };
  if (parsed.data.trackingNumber !== undefined) update.tracking_number = parsed.data.trackingNumber || null;
  const { error } = await admin.from('orders').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: 'A rendelés frissítése nem sikerült.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
