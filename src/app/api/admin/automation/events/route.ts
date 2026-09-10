import { NextRequest, NextResponse } from 'next/server';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasCurrentPlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchEventDrivenWorkflow, isEventDrivenWorkflowType, EVENT_DRIVEN_WORKFLOW_AUTHORITY } from '@/lib/automation/event-driven-workflows';

export const dynamic = 'force-dynamic';

async function access() {
  const user = await getAdminRequestUser('store.manage');
  if (!user) return null;
  const store = await requireCurrentStoreContext('store.manage');
  if (!(await hasCurrentPlanFeature('automation'))) return null;
  return { user, store };
}

export async function GET() {
  const context = await access();
  if (!context) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from('automation_processing_runs')
    .select('id,run_key,started_at,completed_at,metadata')
    .eq('instance_id', context.store.instanceId)
    .eq('metadata->>authority', EVENT_DRIVEN_WORKFLOW_AUTHORITY)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: 'Az esemény-workflow futások nem tölthetők be.' }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await access();
  if (!context) return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 403 });
  let body: { eventType?: string; sourceId?: string; title?: string; description?: string; evidence?: unknown; runId?: string; forceRetry?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }); }

  let eventType = String(body.eventType ?? ''), sourceId = String(body.sourceId ?? ''), title = body.title, description = body.description, evidence = body.evidence;
  let forceRetry = false;
  if (body.runId) {
    const admin = createAdminClient();
    const { data: run, error } = await admin.from('automation_processing_runs').select('metadata').eq('id', String(body.runId)).eq('instance_id', context.store.instanceId).maybeSingle();
    if (error || !run) return NextResponse.json({ error: 'A workflow-futás nem található.' }, { status: 404 });
    const metadata = run.metadata && typeof run.metadata === 'object' && !Array.isArray(run.metadata) ? run.metadata as Record<string, unknown> : {};
    if (metadata.authority !== EVENT_DRIVEN_WORKFLOW_AUTHORITY || metadata.status !== 'retry') return NextResponse.json({ error: 'Csak újrapróbálásra váró workflow indítható kézzel.' }, { status: 409 });
    const event = metadata.event && typeof metadata.event === 'object' && !Array.isArray(metadata.event) ? metadata.event as Record<string, unknown> : {};
    eventType = typeof event.type === 'string' ? event.type : '';
    sourceId = typeof event.sourceId === 'string' ? event.sourceId : '';
    title = typeof event.title === 'string' ? event.title : undefined;
    description = typeof event.description === 'string' ? event.description : undefined;
    evidence = event.evidence;
    forceRetry = true;
  }

  if (!isEventDrivenWorkflowType(eventType) || !sourceId || sourceId.length > 180) return NextResponse.json({ error: 'Nem támogatott esemény vagy forrásazonosító.' }, { status: 400 });
  if (title !== undefined && (typeof title !== 'string' || title.length > 160)) return NextResponse.json({ error: 'Érvénytelen cím.' }, { status: 400 });
  if (description !== undefined && (typeof description !== 'string' || description.length > 500)) return NextResponse.json({ error: 'Érvénytelen leírás.' }, { status: 400 });
  if (evidence !== undefined && (!evidence || typeof evidence !== 'object' || Array.isArray(evidence))) return NextResponse.json({ error: 'Érvénytelen evidencia.' }, { status: 400 });

  const result = await dispatchEventDrivenWorkflow({
    instanceId: context.store.instanceId,
    type: eventType,
    sourceId,
    title,
    description,
    evidence: evidence as Record<string, unknown> | undefined,
  }, { forceRetry });
  const status = result.status === 'dead_letter' ? 409 : result.status === 'retry' ? 202 : 200;
  return NextResponse.json({ ok: result.ok, data: result }, { status });
}
