import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const page = read('src/app/admin/automatizalas/page.tsx');
const controls = read('src/components/admin/automation-center-actions.tsx');
const runApi = read('src/app/api/admin/automation/run/route.ts');
const instanceApi = read('src/app/api/admin/automation/instance/route.ts');
const controlApi = read('src/app/api/admin/automation/control/route.ts');

describe('automation safety workflows', () => {
  test('automation remains Pro-only and store-permission guarded', () => {
    expect(page).toMatch(/requirePlanFeature\('automation'\)/);
    for (const api of [runApi, instanceApi, controlApi]) {
      expect(api).toMatch(/getAdminRequestUser\('store\.manage'\)/);
      expect(api).toMatch(/requireCurrentStoreContext\('store\.manage'\)/);
      expect(api).toMatch(/hasCurrentPlanFeature\('automation'\)/);
      expect(api).toMatch(/status:403/);
    }
  });

  test('automation dashboard is tenant scoped and surfaces circuit-breaker health', () => {
    expect(page).toMatch(/eq\('instance_id',store\.instanceId\)/);
    expect(page).toMatch(/global_paused/);
    expect(page).toMatch(/consecutive_failures/);
    expect(page).toMatch(/circuit_open_until/);
    expect(page).toMatch(/webshoponként elkülönített/);
  });

  test('instance UI exposes only explicit lifecycle transitions', () => {
    expect(controls).toMatch(/status==='planned'/);
    expect(controls).toMatch(/act\('activate'\)/);
    expect(controls).toMatch(/status==='active'/);
    expect(controls).toMatch(/act\('pause'\)/);
    expect(controls).toMatch(/status==='paused'/);
    expect(controls).toMatch(/act\('resume'\)/);
    expect(controls).toMatch(/executableSteps>0/);
    expect(controls).toMatch(/act\('step'\)/);
    expect(controls).toMatch(/act\('cancel'\)/);
  });

  test('instance API allowlists actions and delegates mutations to audited database RPCs', () => {
    expect(instanceApi).toMatch(/\['activate','pause','resume','cancel','step'\]\.includes\(action\)/);
    expect(instanceApi).toMatch(/activate_automation_runbook/);
    expect(instanceApi).toMatch(/execute_automation_step/);
    expect(instanceApi).toMatch(/transition_automation_instance/);
    expect(instanceApi).toMatch(/p_actor_id:user\.id/);
    expect(instanceApi).toMatch(/p_event_key:key/);
  });

  test('store pause is explicit, authenticated and persisted through tenant-safe RPC', () => {
    expect(controls).toMatch(/Globális folytatás/);
    expect(controls).toMatch(/Globális szünet/);
    expect(controlApi).toMatch(/typeof body\.paused!=='boolean'/);
    expect(controlApi).toMatch(/set_store_automation_pause_v2/);
    expect(controlApi).toMatch(/p_instance_id:store\.instanceId/);
    expect(controlApi).toMatch(/p_actor_id:user\.id/);
    expect(controlApi).toMatch(/p_paused:body\.paused/);
  });

  test('manual cycle uses the tenant-safe v2 processor and an explicit run key', () => {
    expect(runApi).toMatch(/process_automation_cycle_v2/);
    expect(runApi).toMatch(/store\.instanceId/);
    expect(runApi).toMatch(/crypto\.randomUUID\(\)/);
    expect(runApi).toMatch(/p_run_key:runKey/);
  });
});
