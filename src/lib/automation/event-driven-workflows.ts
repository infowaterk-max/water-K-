import { createAdminClient } from '@/lib/supabase/admin';

export const EVENT_DRIVEN_WORKFLOW_VERSION = 'block17.v1';
export const EVENT_DRIVEN_WORKFLOW_AUTHORITY = 'event-driven-workflow';
const MAX_ENGINE_ATTEMPTS = 5;
const DEFAULT_RETRY_MINUTES = 15;

export const EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS = {
  'operations.exception.detected': { runbookKey: 'operations-triage', category: 'operations', severity: 'warning', priority: 65, title: 'Műveleti kivétel' },
  'inventory.pressure.detected': { runbookKey: 'inventory-pressure', category: 'inventory', severity: 'warning', priority: 70, title: 'Készletnyomás' },
  'service.escalation.requested': { runbookKey: 'service-escalation', category: 'service', severity: 'high', priority: 80, title: 'Ügyfélszolgálati eszkaláció' },
  'commercial.high_risk.detected': { runbookKey: 'commercial-high-risk', category: 'commercial', severity: 'high', priority: 90, title: 'Magas kockázatú kereskedelmi esemény' },
  'customer.value_risk.detected': { runbookKey: 'customer-value-risk', category: 'customer', severity: 'high', priority: 80, title: 'Ügyfélérték-kockázat' },
  'system.recovery.requested': { runbookKey: 'system-recovery', category: 'system', severity: 'high', priority: 90, title: 'Rendszer-helyreállítás szükséges' },
} as const;

export type EventDrivenWorkflowType = keyof typeof EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS;
export type EventDrivenWorkflowInput = {
  instanceId: string;
  type: EventDrivenWorkflowType;
  sourceId: string;
  occurredAt?: string;
  title?: string;
  description?: string;
  evidence?: Record<string, unknown>;
};
export type EventDrivenWorkflowStatus = 'completed' | 'awaiting_approval' | 'retry' | 'dead_letter' | 'idempotent';
export type EventDrivenWorkflowResult = {
  ok: boolean;
  status: EventDrivenWorkflowStatus;
  runKey: string;
  processingRunId: string;
  runbookInstanceId?: string;
  nextAttemptAt?: string;
  error?: string;
};

type ProcessingRun = { id: string; run_key: string; metadata: Record<string, unknown> | null };
type DispatchOptions = { forceRetry?: boolean };

function cleanToken(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 180 || !/^[A-Za-z0-9_.:@/-]+$/.test(normalized)) throw new Error(`${label}_INVALID`);
  return normalized;
}

function safeText(value: unknown, max = 500) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, max) : undefined;
}

const sensitiveKey = /(email|name|address|phone|token|secret|password|payment|card|iban|customer_data)/i;
export function sanitizeWorkflowEvidence(value: Record<string, unknown> | undefined) {
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value ?? {}).slice(0, 32)) {
    if (sensitiveKey.test(key)) { result[key] = '[redacted]'; continue; }
    if (raw === null || typeof raw === 'boolean' || typeof raw === 'number') result[key] = raw;
    else if (typeof raw === 'string') result[key] = raw.slice(0, 240);
  }
  return result;
}

export function eventDrivenWorkflowRunKey(input: Pick<EventDrivenWorkflowInput, 'instanceId' | 'type' | 'sourceId'>) {
  return `block17:${cleanToken(input.instanceId, 'INSTANCE')}:${input.type}:${cleanToken(input.sourceId, 'SOURCE')}`;
}

export function isEventDrivenWorkflowType(value: string): value is EventDrivenWorkflowType {
  return Object.prototype.hasOwnProperty.call(EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS, value);
}

function metadataOf(run: ProcessingRun) {
  return run.metadata && typeof run.metadata === 'object' && !Array.isArray(run.metadata) ? run.metadata : {};
}

function isoAfterMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function updateProcessingRun(admin: ReturnType<typeof createAdminClient>, instanceId: string, id: string, planned: Record<string, unknown>, reconciled: Record<string, unknown>, metadata: Record<string, unknown>, completed = false) {
  const patch: Record<string, unknown> = { planned, reconciled, metadata };
  if (completed) patch.completed_at = new Date().toISOString();
  const { error } = await admin.from('automation_processing_runs').update(patch).eq('id', id).eq('instance_id', instanceId);
  if (error) throw error;
}

async function claimProcessingRun(admin: ReturnType<typeof createAdminClient>, input: EventDrivenWorkflowInput, runKey: string, options: DispatchOptions) {
  const { data: existing, error: existingError } = await admin.from('automation_processing_runs').select('id,run_key,metadata').eq('instance_id', input.instanceId).eq('run_key', runKey).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const run = existing as ProcessingRun;
    const metadata = metadataOf(run);
    const status = String(metadata.status ?? '');
    const nextAttemptAt = typeof metadata.nextAttemptAt === 'string' ? metadata.nextAttemptAt : undefined;
    if (status === 'completed' || status === 'awaiting_approval') return { run, terminal: true as const };
    if (status === 'dead_letter' && !options.forceRetry) return { run, terminal: true as const };
    if (status === 'retry' && !options.forceRetry && nextAttemptAt && Date.parse(nextAttemptAt) > Date.now()) return { run, terminal: true as const };
    return { run, terminal: false as const };
  }
  const event = {
    type: input.type,
    sourceId: cleanToken(input.sourceId, 'SOURCE'),
    occurredAt: input.occurredAt && !Number.isNaN(Date.parse(input.occurredAt)) ? new Date(input.occurredAt).toISOString() : new Date().toISOString(),
    title: safeText(input.title, 160),
    description: safeText(input.description, 500),
    evidence: sanitizeWorkflowEvidence(input.evidence),
  };
  const metadata = { authority: EVENT_DRIVEN_WORKFLOW_AUTHORITY, version: EVENT_DRIVEN_WORKFLOW_VERSION, status: 'processing', attempt: 0, event };
  const { data, error } = await admin.from('automation_processing_runs').insert({ instance_id: input.instanceId, run_key: runKey, planned: {}, reconciled: {}, metadata }).select('id,run_key,metadata').single();
  if (!error && data) return { run: data as ProcessingRun, terminal: false as const };
  const { data: raced, error: racedError } = await admin.from('automation_processing_runs').select('id,run_key,metadata').eq('instance_id', input.instanceId).eq('run_key', runKey).maybeSingle();
  if (racedError || !raced) throw error ?? racedError ?? new Error('WORKFLOW_CLAIM_FAILED');
  return { run: raced as ProcessingRun, terminal: true as const };
}

async function ensureAlert(admin: ReturnType<typeof createAdminClient>, input: EventDrivenWorkflowInput, runKey: string) {
  const subscription = EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS[input.type];
  const alertKey = `workflow:${input.type}:${cleanToken(input.sourceId, 'SOURCE')}`;
  const { data: found, error: findError } = await admin.from('control_alerts').select('id,status').eq('instance_id', input.instanceId).eq('alert_key', alertKey).maybeSingle();
  if (findError) throw findError;
  if (found?.id) return String(found.id);
  const { data, error } = await admin.from('control_alerts').insert({
    instance_id: input.instanceId,
    alert_key: alertKey,
    category: subscription.category,
    alert_type: input.type,
    severity: subscription.severity,
    priority_score: subscription.priority,
    title: safeText(input.title, 160) ?? subscription.title,
    description: safeText(input.description, 500) ?? `Eseményvezérelt workflow: ${input.type}`,
    recommended_action: 'A Shoperation kontrollált runbook-folyamata szerint kezeld az eseményt.',
    evidence: { authority: EVENT_DRIVEN_WORKFLOW_AUTHORITY, runKey, sourceId: input.sourceId, ...sanitizeWorkflowEvidence(input.evidence) },
  }).select('id').single();
  if (error || !data?.id) throw error ?? new Error('WORKFLOW_ALERT_CREATE_FAILED');
  return String(data.id);
}

async function ensureRunbookInstance(admin: ReturnType<typeof createAdminClient>, input: EventDrivenWorkflowInput, runKey: string, alertId: string) {
  const subscription = EVENT_DRIVEN_WORKFLOW_SUBSCRIPTIONS[input.type];
  const { data: runbook, error: runbookError } = await admin.from('automation_runbooks').select('id,runbook_key,version,max_duration_hours,requires_action_approval').eq('runbook_key', subscription.runbookKey).eq('enabled', true).order('version', { ascending: false }).limit(1).maybeSingle();
  if (runbookError || !runbook?.id) throw runbookError ?? new Error('WORKFLOW_RUNBOOK_NOT_FOUND');
  const instanceKey = `${runKey}:runbook:${runbook.runbook_key}:v${runbook.version}`;
  const { data: existing, error: existingError } = await admin.from('automation_runbook_instances').select('id,status').eq('instance_id', input.instanceId).eq('instance_key', instanceKey).maybeSingle();
  if (existingError) throw existingError;
  let runbookInstanceId = existing?.id ? String(existing.id) : '';
  if (!runbookInstanceId) {
    const deadlineAt = new Date(Date.now() + Number(runbook.max_duration_hours ?? 48) * 60 * 60_000).toISOString();
    const { data: created, error: createError } = await admin.from('automation_runbook_instances').insert({
      instance_id: input.instanceId,
      instance_key: instanceKey,
      runbook_id: runbook.id,
      alert_id: alertId,
      proposal_id: null,
      status: 'planned',
      source_snapshot: { authority: EVENT_DRIVEN_WORKFLOW_AUTHORITY, eventType: input.type, sourceId: input.sourceId, runKey },
      deadline_at: deadlineAt,
    }).select('id,status').single();
    if (createError || !created?.id) throw createError ?? new Error('WORKFLOW_INSTANCE_CREATE_FAILED');
    runbookInstanceId = String(created.id);
  }
  const { data: steps, error: stepsError } = await admin.from('automation_runbook_steps').select('id,step_order').eq('runbook_id', runbook.id).order('step_order', { ascending: true });
  if (stepsError || !steps?.length) throw stepsError ?? new Error('WORKFLOW_STEPS_MISSING');
  const { data: existingSteps, error: existingStepsError } = await admin.from('automation_step_runs').select('step_id').eq('instance_id', runbookInstanceId);
  if (existingStepsError) throw existingStepsError;
  const existingIds = new Set((existingSteps ?? []).map((row: { step_id: string }) => row.step_id));
  for (const step of steps as Array<{ id: string; step_order: number }>) {
    if (existingIds.has(step.id)) continue;
    const { error } = await admin.from('automation_step_runs').insert({ instance_id: runbookInstanceId, store_instance_id: input.instanceId, step_id: step.id, status: step.step_order === 1 ? 'ready' : 'pending', ready_at: step.step_order === 1 ? new Date().toISOString() : null });
    if (error) throw error;
  }
  return { runbookInstanceId, requiresApproval: Boolean(runbook.requires_action_approval), runbookKey: String(runbook.runbook_key), runbookVersion: Number(runbook.version) };
}

async function executeRunbook(admin: ReturnType<typeof createAdminClient>, input: EventDrivenWorkflowInput, runKey: string, runbookInstanceId: string, requiresApproval: boolean) {
  for (let index = 0; index < 12; index++) {
    const { data: instance, error: instanceError } = await admin.from('automation_runbook_instances').select('status').eq('id', runbookInstanceId).eq('instance_id', input.instanceId).maybeSingle();
    if (instanceError || !instance) throw instanceError ?? new Error('WORKFLOW_INSTANCE_LOST');
    if (instance.status === 'completed') return { status: 'completed' as const };
    if (instance.status === 'cancelled' || instance.status === 'failed') return { status: 'dead_letter' as const, error: `RUNBOOK_${String(instance.status).toUpperCase()}` };
    if (instance.status === 'paused') return { status: 'retry' as const, nextAttemptAt: isoAfterMinutes(DEFAULT_RETRY_MINUTES), error: 'RUNBOOK_PAUSED' };
    if (instance.status === 'planned') {
      if (requiresApproval) return { status: 'awaiting_approval' as const };
      const { error } = await admin.rpc('activate_automation_runbook_v2', { p_store_instance_id: input.instanceId, p_runbook_instance_id: runbookInstanceId, p_actor_id: null, p_event_key: `${runKey}:activate` });
      if (error) throw error;
      continue;
    }
    const executionKey = `${runKey}:step:${index}`;
    const { data: step, error: stepError } = await admin.rpc('execute_automation_step_v2', { p_store_instance_id: input.instanceId, p_runbook_instance_id: runbookInstanceId, p_actor_id: null, p_execution_key: executionKey });
    if (stepError) {
      if (/no_executable_step|automation_circuit_open/i.test(stepError.message ?? '')) return { status: 'retry' as const, nextAttemptAt: isoAfterMinutes(DEFAULT_RETRY_MINUTES), error: stepError.message };
      throw stepError;
    }
    const row = (Array.isArray(step) ? step[0] : step) as { id?: string; step_id?: string; status?: string; attempt_count?: number; next_attempt_at?: string | null } | null;
    if (!row?.id) throw new Error('WORKFLOW_STEP_EVIDENCE_MISSING');
    if (row.status === 'failed') {
      const { data: definition } = await admin.from('automation_runbook_steps').select('max_attempts').eq('id', row.step_id).maybeSingle();
      const exhausted = Number(row.attempt_count ?? 0) >= Number(definition?.max_attempts ?? 1);
      return exhausted ? { status: 'dead_letter' as const, error: 'STEP_ATTEMPTS_EXHAUSTED' } : { status: 'retry' as const, nextAttemptAt: row.next_attempt_at ?? isoAfterMinutes(DEFAULT_RETRY_MINUTES), error: 'STEP_RETRY_SCHEDULED' };
    }
  }
  return { status: 'retry' as const, nextAttemptAt: isoAfterMinutes(DEFAULT_RETRY_MINUTES), error: 'WORKFLOW_STEP_LIMIT_REACHED' };
}

export async function dispatchEventDrivenWorkflow(input: EventDrivenWorkflowInput, options: DispatchOptions = {}): Promise<EventDrivenWorkflowResult> {
  if (!isEventDrivenWorkflowType(input.type)) throw new Error('WORKFLOW_EVENT_TYPE_UNSUPPORTED');
  cleanToken(input.instanceId, 'INSTANCE'); cleanToken(input.sourceId, 'SOURCE');
  const runKey = eventDrivenWorkflowRunKey(input), admin = createAdminClient();
  const claimed = await claimProcessingRun(admin, input, runKey, options), run = claimed.run, previous = metadataOf(run);
  const previousStatus = String(previous.status ?? '');
  if (claimed.terminal) return { ok: previousStatus === 'completed' || previousStatus === 'awaiting_approval', status: previousStatus === 'completed' ? 'idempotent' : (previousStatus as EventDrivenWorkflowStatus), runKey, processingRunId: run.id, runbookInstanceId: typeof previous.runbookInstanceId === 'string' ? previous.runbookInstanceId : undefined, nextAttemptAt: typeof previous.nextAttemptAt === 'string' ? previous.nextAttemptAt : undefined, error: typeof previous.error === 'string' ? previous.error : undefined };
  const attempt = Number(previous.attempt ?? 0) + 1;
  const event = previous.event && typeof previous.event === 'object' ? previous.event : { type: input.type, sourceId: input.sourceId, evidence: sanitizeWorkflowEvidence(input.evidence) };
  try {
    const alertId = await ensureAlert(admin, input, runKey);
    const instance = await ensureRunbookInstance(admin, input, runKey, alertId);
    const outcome = await executeRunbook(admin, input, runKey, instance.runbookInstanceId, instance.requiresApproval);
    const status = outcome.status;
    const metadata = { authority: EVENT_DRIVEN_WORKFLOW_AUTHORITY, version: EVENT_DRIVEN_WORKFLOW_VERSION, status, attempt, event, alertId, runbookInstanceId: instance.runbookInstanceId, runbookKey: instance.runbookKey, runbookVersion: instance.runbookVersion, nextAttemptAt: 'nextAttemptAt' in outcome ? outcome.nextAttemptAt : undefined, error: 'error' in outcome ? outcome.error : undefined };
    await updateProcessingRun(admin, input.instanceId, run.id, { eventType: input.type, subscriber: instance.runbookKey }, { status, runbookInstanceId: instance.runbookInstanceId }, metadata, status === 'completed' || status === 'awaiting_approval' || status === 'dead_letter');
    return { ok: status === 'completed' || status === 'awaiting_approval', status, runKey, processingRunId: run.id, runbookInstanceId: instance.runbookInstanceId, nextAttemptAt: 'nextAttemptAt' in outcome ? outcome.nextAttemptAt : undefined, error: 'error' in outcome ? outcome.error : undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WORKFLOW_DISPATCH_FAILED';
    const status: EventDrivenWorkflowStatus = attempt >= MAX_ENGINE_ATTEMPTS ? 'dead_letter' : 'retry';
    const nextAttemptAt = status === 'retry' ? isoAfterMinutes(DEFAULT_RETRY_MINUTES * Math.min(attempt, 4)) : undefined;
    await updateProcessingRun(admin, input.instanceId, run.id, { eventType: input.type }, { status }, { authority: EVENT_DRIVEN_WORKFLOW_AUTHORITY, version: EVENT_DRIVEN_WORKFLOW_VERSION, status, attempt, event, nextAttemptAt, error: message }, status === 'dead_letter');
    return { ok: false, status, runKey, processingRunId: run.id, nextAttemptAt, error: message };
  }
}

export async function retryDueEventDrivenWorkflows(instanceId: string, limit = 20) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('automation_processing_runs').select('id,metadata').eq('instance_id', instanceId).eq('metadata->>authority', EVENT_DRIVEN_WORKFLOW_AUTHORITY).eq('metadata->>status', 'retry').order('started_at', { ascending: true }).limit(Math.max(1, Math.min(limit, 50)));
  if (error) throw error;
  const results: EventDrivenWorkflowResult[] = [];
  for (const row of data ?? []) {
    const metadata = metadataOf(row as ProcessingRun), nextAttemptAt = typeof metadata.nextAttemptAt === 'string' ? metadata.nextAttemptAt : undefined;
    if (nextAttemptAt && Date.parse(nextAttemptAt) > Date.now()) continue;
    const event = metadata.event as Record<string, unknown> | undefined;
    const type = typeof event?.type === 'string' ? event.type : '', sourceId = typeof event?.sourceId === 'string' ? event.sourceId : '';
    if (!isEventDrivenWorkflowType(type) || !sourceId) continue;
    results.push(await dispatchEventDrivenWorkflow({ instanceId, type, sourceId, occurredAt: typeof event?.occurredAt === 'string' ? event.occurredAt : undefined, title: typeof event?.title === 'string' ? event.title : undefined, description: typeof event?.description === 'string' ? event.description : undefined, evidence: event?.evidence && typeof event.evidence === 'object' && !Array.isArray(event.evidence) ? event.evidence as Record<string, unknown> : undefined }));
  }
  return results;
}
