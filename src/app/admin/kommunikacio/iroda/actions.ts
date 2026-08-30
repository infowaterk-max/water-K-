'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';

async function access() {
  const adminUser = await requireAdmin();
  await requirePlanFeature('officeCommunication');
  return { db: createAdminClient(), userId: adminUser.id };
}

export async function createThreadAction(form: FormData) {
  const { db, userId } = await access();
  const subject = String(form.get('subject') ?? '').trim().slice(0, 180);
  let email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 320);
  const orderId = String(form.get('orderId') ?? '').trim();
  const body = String(form.get('body') ?? '').trim().slice(0, 10000);
  if (!subject || !body) return;
  if (orderId && !email) {
    const { data: order } = await db.from('orders').select('customer_email').eq('id', orderId).maybeSingle();
    email = order?.customer_email?.trim().toLowerCase() ?? '';
  }
  const { data } = await db.from('office_threads').insert({ subject, customer_email: email || null, order_id: orderId || null, created_by: userId }).select('id').single();
  if (data?.id) await db.from('office_messages').insert({ thread_id: data.id, author_id: userId, kind: 'internal', body });
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function addMessageAction(form: FormData) {
  const { db, userId } = await access();
  const threadId = String(form.get('threadId') ?? '');
  const body = String(form.get('body') ?? '').trim().slice(0, 10000);
  const kind = String(form.get('kind') ?? 'internal');
  if (!threadId || !body || !['internal', 'note'].includes(kind)) return;
  await db.from('office_messages').insert({ thread_id: threadId, author_id: userId, kind, body });
  await db.from('office_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function sendCustomerEmailAction(form: FormData) {
  const { db, userId } = await access();
  const threadId = String(form.get('threadId') ?? '');
  const body = String(form.get('body') ?? '').trim().slice(0, 4000);
  if (!threadId || !body) return;
  const { data: thread } = await db.from('office_threads').select('id,subject,customer_email,order_id').eq('id', threadId).maybeSingle();
  if (!thread?.customer_email) return;
  const email = thread.customer_email.trim().toLowerCase();
  const [{ data: profile }, { data: order }] = await Promise.all([
    db.from('profiles').select('id,full_name').eq('email', email).maybeSingle(),
    thread.order_id ? db.from('orders').select('order_number').eq('id', thread.order_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const idempotencyKey = `office:${threadId}:${randomUUID()}`;
  const payload = {
    name: profile?.full_name || 'Vásárlónk',
    ticketId: threadId,
    ticketNumber: order?.order_number || thread.subject,
    replyPreview: body,
    orderNumber: order?.order_number || null,
    officeThreadId: threadId,
  };
  const { data: job, error } = await db.from('communication_jobs').insert({
    recipient_email: email,
    user_id: profile?.id ?? null,
    purpose: 'transactional',
    template_key: 'support_reply',
    payload,
    idempotency_key: idempotencyKey,
    requires_approval: false,
    approved_at: new Date().toISOString(),
    approved_by: userId,
  }).select('id').single();
  if (error || !job?.id) return;
  await db.from('office_messages').insert({ thread_id: threadId, author_id: userId, kind: 'email_out', body, communication_job_id: job.id, recipient_email: email, subject: `Re: ${thread.subject}` });
  await db.from('office_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  revalidatePath('/admin/kommunikacio/iroda');
  revalidatePath('/admin/kommunikacio');
}

export async function createTaskAction(form: FormData) {
  const { db, userId } = await access();
  const threadId = String(form.get('threadId') ?? '');
  const title = String(form.get('title') ?? '').trim().slice(0, 240);
  const due = String(form.get('due') ?? '');
  if (!title) return;
  await db.from('office_tasks').insert({ thread_id: threadId || null, title, created_by: userId, due_at: due ? new Date(due).toISOString() : null });
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function completeTaskAction(form: FormData) {
  const { db } = await access();
  const id = String(form.get('id') ?? '');
  if (!id) return;
  await db.from('office_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/kommunikacio/iroda');
}
