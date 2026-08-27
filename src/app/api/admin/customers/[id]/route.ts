import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  role: z.enum(['customer','reseller']).optional(),
  resellerApproved: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Nincs módosítás.');

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Érvénytelen ügyfélazonosító.' }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Érvénytelen ügyféladat.' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.role !== undefined) update.role = parsed.data.role;
  if (parsed.data.resellerApproved !== undefined) update.reseller_approved = parsed.data.resellerApproved;
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update(update).eq('id', id).neq('role', 'admin');
  if (error) return NextResponse.json({ error: 'Az ügyfél módosítása nem sikerült.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
