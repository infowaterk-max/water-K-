import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const page = read('src/app/admin/automatizalas/page.tsx');
const controls = read('src/components/admin/automation-center-actions.tsx');
const runApi = read('src/app/api/admin/automation/run/route.ts');
const instanceApi = read('src/app/api/admin/automation/instance/route.ts');
const globalApi = read('src/app/api/admin/automation/control/route.ts');

describe('automation safety workflows', () => {
  test('automation remains a Pro-only admin capability on UI and APIs', () => {
    expect(page).toMatch(/requirePlanFeature\('automation'\)/);
    for (const api of [runApi, instanceApi, globalApi]) {
      expect(api).toMatch(/getAdminRequestUser\(\)/);
      expect(api).toMatch(/hasCurrentPlanFeature\('automation'\)/);
      expect(api).toMatch(/status:403/);
    }
  });

  test('automation remains control-plane only and surfaces operational safeguards', () => {
    expect(page).toMatch(/üzleti forrásállapotot nem módosít automatikusan/);
    expect(page).toMatch(/retry\/backoff/);
    expect(page).toMatch(/SLA-eszkaláció/);
    expect(page).toMatch(/circuit breaker/);
    expect(page).toMatch(/global_paused/);
    expect(page).toMatch(/consecutive_failures/);
    expect(page).toMatch(/circuit_open_until/);
  });

  test('queue prioritizes overdue, escalated and high-priority work', () => {
    expect(page).toMatch(/order\('overdue',\{ascending:false\}\)/);
    expect(page).toMatch(/order\('escalation_level',\{ascending:false\}\)/);
    expect(page).toMatch(/order\('priority_score',\{ascending:false\}\)/);
    expect(page).toMatch(/LEJÁRT/);
    expect(page).toMatch(/requires_action_approval/);
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

  test('global pause is explicit, authenticated and persisted through the guarded RPC', () => {
    expect(controls).toMatch(/Globális folytatás/);
    expect(controls).toMatch(/Globális szünet/);
    expect(globalApi).toMatch(/typeof body\.paused!=='boolean'/);
    expect(globalApi).toMatch(/set_automation_global_pause/);
    expect(globalApi).toMatch(/p_actor_id:user\.id/);
    expect(globalApi).toMatch(/p_paused:body\.paused/);
  });

  test('manual cycle uses a bounded minute-level run key for duplicate suppression', () => {
    expect(runApi).toMatch(/process_automation_cycle/);
    expect(runApi).toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0,16\)/);
    expect(runApi).toMatch(/p_run_key:runKey/);
  });
});
