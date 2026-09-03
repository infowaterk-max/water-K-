import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/app/admin/integraciok/page.tsx');
const control = read('src/components/admin/integration-job-control.tsx');
const retryApi = read('src/app/api/admin/integrations/[id]/run/route.ts');
const processor = read('src/lib/integrations/processor.ts');
const evidenceSql = read('supabase/migrations/20260903163000_order_integration_evidence_atomic_v2.sql');

describe('advanced integration operations', () => {
  test('advanced integration operations remain Pro-only on page and retry API', () => {
    expect(page).toMatch(/requirePlanFeature\('advancedIntegrations'\)/);
    expect(retryApi).toMatch(/getAdminRequestUser\('integrations\.manage'\)/);
    expect(retryApi).toMatch(/hasCurrentPlanFeature\('advancedIntegrations'\)/);
    expect(retryApi).toMatch(/status:403/);
  });

  test('operations UI surfaces job state, attempts, next retry and last error', () => {
    expect(page).toMatch(/attempt_count/);
    expect(page).toMatch(/next_attempt_at/);
    expect(page).toMatch(/last_error/);
    expect(page).toMatch(/pending:'Várakozik'/);
    expect(page).toMatch(/processing:'Folyamatban'/);
    expect(page).toMatch(/failed:'Sikertelen'/);
    expect(page).toMatch(/blocked:'Blokkolt'/);
  });

  test('manual retry is disabled for processing and succeeded jobs', () => {
    expect(page).toMatch(/disabled=\{loadError\|\|job\.status==='processing'\|\|job\.status==='succeeded'\}/);
    expect(control).toMatch(/disabled=\{busy\|\|disabled\}/);
  });

  test('manual retry atomically claims the job before processing and rejects duplicate work', () => {
    expect(retryApi).toMatch(/claim_integration_job/);
    expect(retryApi).toMatch(/processing_token/);
    expect(retryApi).toMatch(/már feldolgozás alatt van, vagy nem futtatható újra/);
    expect(retryApi).toMatch(/status:409/);
    expect(retryApi).toMatch(/processIntegrationJob\(scope\.instanceId,id,claim\.processing_token,\{manualActorId:actor\.id\}\)/);
  });

  test('processor requires the exact processing claim token throughout lifecycle writes', () => {
    expect(processor).toMatch(/eq\('status','processing'\)\.eq\('processing_token',claimToken\)/);
    expect(processor).toMatch(/Integration job claim lost before processing/);
    expect(processor).toMatch(/Integration job claim lost before completion/);
  });

  test('retry policy is bounded and blocked errors do not spin forever', () => {
    expect(processor).toMatch(/MAX_ATTEMPTS=5/);
    expect(processor).toMatch(/Math\.min\(15\*Math\.pow/);
    expect(processor).toMatch(/240/);
    expect(processor).toMatch(/blocked=isBlockedError\(error\)\|\|attempt>=MAX_ATTEMPTS/);
    expect(processor).toMatch(/next_attempt_at:blocked\?null:retryAt\(attempt\)/);
  });

  test('shipment and invoice integrations protect against duplicate external artifacts', () => {
    expect(processor).toMatch(/if\(order\.tracking_number\)return await complete/);
    expect(processor).toMatch(/is\('tracking_number',null\)/);
    expect(processor).toMatch(/Shipment reconciliation required/);
    expect(processor).toMatch(/if\(order\.invoice_number\)return await complete/);
    expect(processor).toMatch(/is\('invoice_number',null\)/);
    expect(processor).toMatch(/Invoice reconciliation required/);
  });

  test('invoice creation requires immutable tax snapshots and shipment requires weight data', () => {
    expect(processor).toMatch(/Invoice tax snapshot missing/);
    expect(processor).toMatch(/unit_net_huf_snapshot/);
    expect(processor).toMatch(/vat_rate_percent_snapshot/);
    expect(processor).toMatch(/Shipment weight missing for SKU/);
    expect(processor).toMatch(/weight_grams/);
  });

  test('manual retry final state and audit evidence commit together', () => {
    expect(retryApi).toContain('manualActorId:actor.id');
    expect(retryApi).not.toContain('recordAdminAudit');
    expect(processor).toContain('admin_finalize_manual_integration_job_v2');
    expect(evidenceSql).toContain("'integration.retry_succeeded'");
    expect(evidenceSql).toContain("'integration.retry_failed'");
    expect(evidenceSql).toContain('insert into public.admin_audit_log');
  });
});
