import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const protectedEntrypoints = [
  ['src/app/admin/automatizalas/page.tsx', 'automation'],
  ['src/app/admin/beszerzes/page.tsx', 'procurement'],
  ['src/app/admin/cashflow/page.tsx', 'cashflow'],
  ['src/app/admin/kampanyok/page.tsx', 'advancedCampaigns'],
  ['src/app/admin/kommunikacio/iroda/page.tsx', 'officeCommunication'],
  ['src/app/admin/kommunikacio/iroda/actions.ts', 'officeCommunication'],
] as const;

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Pro entitlement entrypoint guards', () => {
  it.each(protectedEntrypoints)('%s requires the expected Pro feature', (path, feature) => {
    const file = source(path);
    expect(file).toMatch(/requirePlanFeature/);
    expect(file).toContain(`requirePlanFeature('${feature}')`);
  });

  it('fails closed to Alap when no valid default plan is configured', () => {
    const file = source('src/lib/plans/access.ts');
    expect(file).toContain("const fallback: PlanCode = isPlanCode(configuredDefault) ? configuredDefault : 'alap'");
    expect(file).not.toContain("configuredDefault) ? configuredDefault : 'pro'");
  });
});
