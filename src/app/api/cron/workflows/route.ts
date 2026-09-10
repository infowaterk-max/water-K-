import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { retryDueEventDrivenWorkflows } from '@/lib/automation/event-driven-workflows';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from('webshop_instances').select('id').in('status', ['pilot', 'active']).order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'Az aktív webshopok nem tölthetők be.' }, { status: 500 });
  const results: Array<{ instanceId: string; ok: boolean; retried?: number; deadLetters?: number; error?: string }> = [];
  for (const instance of data ?? []) {
    try {
      const retried = await retryDueEventDrivenWorkflows(String(instance.id), 20);
      results.push({ instanceId: String(instance.id), ok: retried.every(item => item.status !== 'dead_letter'), retried: retried.length, deadLetters: retried.filter(item => item.status === 'dead_letter').length });
    } catch (cause) {
      results.push({ instanceId: String(instance.id), ok: false, error: cause instanceof Error ? cause.message : 'WORKFLOW_RETRY_FAILED' });
    }
  }
  const ok = results.every(item => item.ok);
  return NextResponse.json({ ok, tenants: results.length, results, checkedAt: new Date().toISOString() }, { status: ok ? 200 : 503 });
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
