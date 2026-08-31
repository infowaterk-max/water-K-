import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const protectedPagesAndActions = [
  ['src/app/admin/automatizalas/page.tsx', 'automation'],
  ['src/app/admin/beszerzes/page.tsx', 'procurement'],
  ['src/app/admin/cashflow/page.tsx', 'cashflow'],
  ['src/app/admin/kampanyok/page.tsx', 'advancedCampaigns'],
  ['src/app/admin/ertekesites/page.tsx', 'crm'],
  ['src/app/admin/kommunikacio/iroda/page.tsx', 'officeCommunication'],
  ['src/app/admin/kommunikacio/iroda/actions.ts', 'officeCommunication'],
] as const;

const protectedApis = [
  ['src/app/api/admin/procurement/route.ts', 'procurement'],
  ['src/app/api/admin/procurement/[id]/route.ts', 'procurement'],
  ['src/app/api/admin/automation/control/route.ts', 'automation'],
  ['src/app/api/admin/automation/run/route.ts', 'automation'],
  ['src/app/api/admin/automation/instance/route.ts', 'automation'],
  ['src/app/api/admin/campaigns/route.ts', 'advancedCampaigns'],
  ['src/app/api/admin/campaigns/manage/route.ts', 'advancedCampaigns'],
  ['src/app/api/admin/commercial/actions/route.ts', 'crm'],
  ['src/app/api/admin/communication/enqueue/route.ts', 'officeCommunication'],
  ['src/app/api/admin/communication/manage/route.ts', 'officeCommunication'],
  ['src/app/api/admin/communication/suppression/route.ts', 'officeCommunication'],
] as const;

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Pro entitlement entrypoint guards', () => {
  it.each(protectedPagesAndActions)('%s requires the expected Pro feature', (path, feature) => {
    const file = source(path);
    expect(file).toMatch(/requirePlanFeature/);
    expect(file).toContain(`requirePlanFeature('${feature}')`);
  });

  it.each(protectedApis)('%s rejects Alap through an API-safe feature check', (path, feature) => {
    const file = source(path);
    expect(file).toMatch(/hasCurrentPlanFeature/);
    expect(file).toContain(`hasCurrentPlanFeature('${feature}')`);
    expect(file).toMatch(/status:403/);
  });

  it('provides an API-safe feature helper without redirect semantics', () => {
    const file = source('src/lib/plans/access.ts');
    expect(file).toContain('export async function hasCurrentPlanFeature');
    expect(file).toContain('return hasPlanFeature(await getCurrentPlan(), feature)');
  });

  it('fails closed to Alap when no valid default plan is configured', () => {
    const file = source('src/lib/plans/access.ts');
    expect(file).toContain("const fallback: PlanCode = isPlanCode(configuredDefault) ? configuredDefault : 'alap'");
    expect(file).not.toContain("configuredDefault) ? configuredDefault : 'pro'");
  });
});
