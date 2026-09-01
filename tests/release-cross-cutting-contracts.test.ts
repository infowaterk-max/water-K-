import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const plans = read('src/lib/plans/catalog.ts');
const planAccess = read('src/lib/plans/access.ts');
const instances = read('src/lib/instances/access.ts');
const manifest = JSON.parse(read('supabase/customer-baseline/manifest.json')) as Record<string, unknown>;

describe('release cross-cutting contracts', () => {
  test('package catalog remains exactly Alap and Pro with API access still planned only', () => {
    expect(plans).toMatch(/export type PlanCode = 'alap' \| 'pro'/);
    expect(plans).toMatch(/PLANNED_PRO_FEATURES = \['apiAccess'\]/);
    const proSection = plans.slice(plans.indexOf('const PRO_FEATURES'), plans.indexOf('export const PLANNED_PRO_FEATURES'));
    expect(proSection).not.toContain("'apiAccess'");
  });

  test('plan resolution fails closed to Alap and prefers the current webshop instance when resolved', () => {
    expect(planAccess).toMatch(/fallback: PlanCode = isPlanCode\(configuredDefault\) \? configuredDefault : 'alap'/);
    expect(planAccess).toMatch(/const instance = await getCurrentWebshopInstance\(\)/);
    expect(planAccess).toMatch(/if \(instance\) return instance\.subscriptionPlan/);
  });

  test('configured instance lookup only accepts pilot or active stores', () => {
    expect(instances).toMatch(/WEBSHOP_INSTANCE_SLUG/);
    expect(instances).toMatch(/in\('status',\['pilot','active'\]\)/);
    expect(instances).toMatch(/isPlanCode\(row\.subscription_plan\)/);
  });

  test('membership fallback refuses ambiguous multi-instance assignment', () => {
    expect(instances).toMatch(/webshop_instance_members/);
    expect(instances).toMatch(/limit\(2\)/);
    expect(instances).toMatch(/memberships\.length!==1/);
  });

  test('new customer baseline remains snapshot-only, neutral and Alap by default', () => {
    expect(manifest.status).toBe('ready');
    expect(manifest.legacyMigrationReplay).toBe(false);
    expect(manifest.sourcePolicy).toBe('schema-snapshot-only');
    expect(manifest.defaultPlan).toBe('alap');
    expect(String(manifest.snapshotFile)).toContain('0001_shoperation_v1_schema.sql');
  });

  test('fresh install proof is already satisfied and not required for every UI-only change', () => {
    expect(manifest.freshInstallProofRequired).toBe(false);
    expect(String(manifest.notes)).toMatch(/Fresh Install/i);
    expect(String(manifest.notes)).toMatch(/empty disposable Supabase project/i);
  });
});
