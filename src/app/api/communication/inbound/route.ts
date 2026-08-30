import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  messageId: z.string().trim().min(3).max(500),
  from: z.string().trim().email().max(320),
  to: z.string().trim().email().max(320).optional(),
  subject: z.string().trim().min(1).max(300),
  text: z.string().trim().min(1).max(50000),
});

function authorized(request: Request) {
  const expected = process.env.COMMUNICATION_WEBHOOK_SECRET ?? '';
  const received = request.headers.get('x-communication-webhook-secret') ?? '';
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Érvénytelen e-mail esemény.' }, { status: 400 });
  const db = createAdminClient();
  const email = parsed.data.from.toLowerCase();
  const { data: existingMessage } = await db.from('office_messages').select('id').eq('external_message_id', parsed.data.messageId).maybeSingle();
  if (existingMessage) return NextResponse.json({ ok: true, duplicate: true });

  let { data: thread } = await db.from('office_threads').select('id,order_id').eq('customer_email', email).eq('status', 'open').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!thread) {
    const { data: order } = await db.from('orders').select('id,order_number').eq('customer_email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const created = await db.from('office_threads').insert({ subject: parsed.data.subject, customer_email: email, order_id: order?.id ?? null }).select('id,order_id').single();
    thread = created.data ?? null;
  }
  if (!thread) return NextResponse.json({ error: 'A beszélgetés nem hozható létre.' }, { status: 500 });

  const { error } = await db.from('office_messages').insert({
    thread_id: thread.id,
    kind: 'email_in',
    body: parsed.data.text,
    external_message_id: parsed.data.messageId,
    sender_email: email,
    recipient_email: parsed.data.to?.toLowerCase() ?? null,
    subject: parsed.data.subject,
  });
  if (error?.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
  if (error) return NextResponse.json({ error: 'A bejövő e-mail mentése nem sikerült.' }, { status: 500 });
  await db.from('office_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);
  return NextResponse.json({ ok: true, threadId: thread.id }, { status: 201 });
}
