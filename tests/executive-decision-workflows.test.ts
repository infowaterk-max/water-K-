import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const actionCenter = read('src/app/admin/intezkedesek/page.tsx');
const actionControls = read('src/components/admin/action-center-actions.tsx');
const controlTower = read('src/app/admin/iranyitokozpont/page.tsx');
const controlActions = read('src/components/admin/control-tower-actions.tsx');
const executive = read('src/app/admin/vezetoi/page.tsx');

describe('executive decision workflows', () => {
  test('control tower and action center remain Pro executive features', () => {
    expect(controlTower).toMatch(/requirePlanFeature\('executiveAnalytics'\)/);
    expect(actionCenter).toMatch(/requirePlanFeature\('executiveAnalytics'\)/);
    expect(executive).toMatch(/requirePlanFeature\('executiveAnalytics'\)/);
  });

  test('control tower remains recommendation-first and does not claim automatic high-impact changes', () => {
    expect(controlTower).toMatch(/magas hatású üzleti állapotot nem módosít automatikusan/);
    expect(controlTower).toMatch(/Döntési és kivételsor/);
    expect(controlTower).toMatch(/recommended_action/);
    expect(controlTower).toMatch(/Forrásmodul/);
  });

  test('control tower keeps alert and task lifecycle explicit', () => {
    expect(controlActions).toMatch(/targetStatus:'acknowledged'|go\('acknowledged'\)/);
    expect(controlActions).toMatch(/go\('snoozed',4\)/);
    expect(controlActions).toMatch(/go\('resolved'\)/);
    expect(controlActions).toMatch(/go\('dismissed'\)/);
    expect(controlActions).toMatch(/go\('in_progress'\)/);
    expect(controlActions).toMatch(/go\('completed'\)/);
    expect(controlActions).toMatch(/Röviden írd le a döntést \/ eredményt/);
  });

  test('action proposals require simulation before approval and approval before execution', () => {
    expect(actionControls).toMatch(/status==='proposed'/);
    expect(actionControls).toMatch(/run\('simulate'\)/);
    expect(actionControls).toMatch(/status==='simulated'/);
    expect(actionControls).toMatch(/run\('approve'\)/);
    expect(actionControls).toMatch(/run\('reject'\)/);
    expect(actionControls).toMatch(/status==='approved'/);
    expect(actionControls).toMatch(/run\('execute'\)/);
  });

  test('action center exposes approval gates, stale simulation and risk ordering', () => {
    expect(actionCenter).toMatch(/approval_mode/);
    expect(actionCenter).toMatch(/approval_count/);
    expect(actionCenter).toMatch(/simulation_stale/);
    expect(actionCenter).toMatch(/order\('risk_score',\{ascending:false\}\)/);
    expect(actionCenter).toMatch(/approvalMode=\{r\.approval_mode\}/);
    expect(actionControls).toMatch(/approvalMode==='dual'/);
    expect(actionCenter).toMatch(/STALE/);
  });

  test('executive dashboard keeps channel, retention and intervention focus together', () => {
    expect(executive).toMatch(/B2C/);
    expect(executive).toMatch(/B2B \/ viszonteladó/);
    expect(executive).toMatch(/Cohort megtartás/);
    expect(executive).toMatch(/Kockázatos ügyfelek/);
    expect(executive).toMatch(/Nyitott checkout recovery/);
    expect(executive).toMatch(/Lejárt B2B újrarendelések/);
  });
});
