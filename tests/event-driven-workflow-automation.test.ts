import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const engine = read('src/lib/automation/event-driven-workflows.ts');
const api = read('src/app/api/admin/automation/events/route.ts');
const sharedCron = read('src/app/api/cron/integrations/route.ts');
const vercel = JSON.parse(read('vercel.json')) as {crons?:Array<{path?:string;schedule?:string}>};
const page = read('src/app/admin/automatizalas/esemenyek/page.tsx');
const docs = read('docs/ROADMAP_BLOCK17_EVENT_DRIVEN_WORKFLOW_AUTOMATION.md');

describe('Roadmap Block 17 — Event-Driven Workflow Automation', () => {
  test('canonical event catalog maps only to existing governed runbooks', () => {
    for (const event of ['operations.exception.detected','inventory.pressure.detected','service.escalation.requested','commercial.high_risk.detected','customer.value_risk.detected','system.recovery.requested']) expect(engine).toContain(`'${event}'`);
    for (const runbook of ['operations-triage','inventory-pressure','service-escalation','commercial-high-risk','customer-value-risk','system-recovery']) expect(engine).toContain(`runbookKey: '${runbook}'`);
  });

  test('engine reuses platform authorities instead of introducing a parallel commerce engine', () => {
    for (const authority of ['automation_processing_runs','control_alerts','automation_runbooks','automation_runbook_instances','automation_runbook_steps','automation_step_runs']) expect(engine).toContain(`'${authority}'`);
    expect(engine).toContain("activate_automation_runbook_v2");
    expect(engine).toContain("execute_automation_step_v2");
    expect(engine).not.toMatch(/from\('orders'\).*update|from\('products'\).*update|from\('inventory'\).*update/s);
    expect(docs).toMatch(/does not create a second order, pricing, inventory, catalog or customer authority/i);
  });

  test('event processing is deterministic, idempotent and bounded', () => {
    expect(engine).toContain('block17:${cleanToken(input.instanceId');
    expect(engine).toMatch(/MAX_ENGINE_ATTEMPTS = 5/);
    expect(engine).toMatch(/DEFAULT_RETRY_MINUTES = 15/);
    expect(engine).toContain("'dead_letter'");
    expect(engine).toContain("'retry'");
    expect(engine).toContain("'awaiting_approval'");
    expect(engine).toMatch(/eq\('instance_id', input\.instanceId\)\.eq\('run_key', runKey\)/);
  });

  test('admin event ingress is permission, plan and tenant scoped', () => {
    expect(api).toMatch(/getAdminRequestUser\('store\.manage'\)/);
    expect(api).toMatch(/requireCurrentStoreContext\('store\.manage'\)/);
    expect(api).toMatch(/hasCurrentPlanFeature\('automation'\)/);
    expect(api).toMatch(/instanceId: context\.store\.instanceId/);
    expect(api).not.toMatch(/body\.instanceId/);
    expect(api).toMatch(/metadata\.authority !== EVENT_DRIVEN_WORKFLOW_AUTHORITY/);
  });

  test('evidence is bounded and sensitive keys are redacted before persistence', () => {
    expect(engine).toMatch(/sensitiveKey/);
    expect(engine).toContain("'[redacted]'");
    expect(engine).toMatch(/Object\.entries\(value \?\? \{\}\)\.slice\(0, 32\)/);
  });

  test('retry reuses the single protected platform cron and never creates a second schedule', () => {
    expect(sharedCron).toMatch(/process\.env\.CRON_SECRET/);
    expect(sharedCron).toMatch(/authorization/);
    expect(sharedCron).toMatch(/retryDueEventDrivenWorkflows/);
    expect(sharedCron).toMatch(/eventDrivenWorkflows/);
    expect(vercel.crons).toHaveLength(1);
    expect(vercel.crons?.[0]?.path).toBe('/api/cron/integrations');
  });

  test('ops surface exposes catalog, retry and dead-letter without Visual Builder scope', () => {
    expect(page).toMatch(/Developer-authored előfizetések/);
    expect(page).toMatch(/Futások, retry és dead-letter/);
    expect(page).toMatch(/Kézi kivizsgálás szükséges/);
    expect(docs).toMatch(/Block 21.*Page Schema \/ Templates/s);
    expect(docs).toMatch(/Block 22.*Visual Builder/s);
    expect(docs).toMatch(/AI-assisted decisioning.*Block 18/s);
    expect(docs).toMatch(/single protected.*cron/i);
  });
});
