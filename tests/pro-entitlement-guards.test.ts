import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const protectedPagesAndActions = [
  ['src/app/admin/automatizalas/page.tsx', 'automation'],['src/app/admin/beszerzes/page.tsx', 'procurement'],['src/app/admin/cashflow/page.tsx', 'cashflow'],['src/app/admin/kampanyok/page.tsx', 'advancedCampaigns'],['src/app/admin/ertekesites/page.tsx', 'crm'],['src/app/admin/elemzes/page.tsx', 'advancedAnalytics'],['src/app/admin/iranyitokozpont/page.tsx', 'executiveAnalytics'],['src/app/admin/integraciok/page.tsx', 'advancedIntegrations'],['src/app/admin/beallitasok/integraciok/[id]/page.tsx', 'advancedIntegrations'],['src/app/admin/kommunikacio/felugyelet/layout.tsx', 'officeCommunicationAdvanced'],['src/app/admin/kommunikacio/layout.tsx', 'officeCommunicationAdvanced'],
] as const;
const protectedApis = [
  ['src/app/api/admin/procurement/route.ts', 'procurement'],['src/app/api/admin/procurement/[id]/route.ts', 'procurement'],['src/app/api/admin/automation/control/route.ts', 'automation'],['src/app/api/admin/automation/run/route.ts', 'automation'],['src/app/api/admin/automation/instance/route.ts', 'automation'],['src/app/api/admin/campaigns/route.ts', 'advancedCampaigns'],['src/app/api/admin/campaigns/manage/route.ts', 'advancedCampaigns'],['src/app/api/admin/commercial/actions/route.ts', 'crm'],['src/app/api/admin/communication/enqueue/route.ts', 'officeCommunicationAdvanced'],['src/app/api/admin/communication/manage/route.ts', 'officeCommunicationAdvanced'],['src/app/api/admin/control-tower/run/route.ts', 'executiveAnalytics'],['src/app/api/admin/control-tower/alert/route.ts', 'executiveAnalytics'],['src/app/api/admin/control-tower/task/route.ts', 'executiveAnalytics'],['src/app/api/admin/actions/run/route.ts', 'executiveAnalytics'],['src/app/api/admin/actions/proposal/route.ts', 'executiveAnalytics'],['src/app/api/admin/assurance/run/route.ts', 'executiveAnalytics'],['src/app/api/admin/assurance/finding/route.ts', 'executiveAnalytics'],['src/app/api/admin/integrations/[id]/run/route.ts', 'advancedIntegrations'],
] as const;
function source(path: string) { return readFileSync(resolve(process.cwd(), path), 'utf8'); }

describe('Pro entitlement entrypoint guards', () => {
  it('requires catalog RLS evidence before Digital Office DB closure',()=>{
    const code=source('scripts/shoperation-office-db-readiness.mjs');
    for(const marker of ['OFFICE_DB_BROAD_ALL_POLICY','OFFICE_DB_PARTICIPANT_READ_HELPER_MISSING','OFFICE_DB_PRO_SUBSCRIPTION_RLS_MISSING','METADATA_CANDIDATE_ONLY','authoritative:false'])expect(code).toContain(marker);
  });
  it('rejects phantom strict Pro Office access without a current tenant, before profile/default plan fallback',()=>{
    const resolver=source('src/lib/plans/access.ts');
    const catalog=source('src/lib/plans/catalog.ts');
    expect(catalog).toContain("export const STRICT_PRO_OFFICE_FEATURES = ['teamChat','officeCommunicationAdvanced']");
    expect(resolver).toContain('isStrictProOfficeFeature');
    const tenantBranch=resolver.indexOf('if(instance){');
    const tenantGrant=resolver.indexOf('getFeatureEntitlementDecision(instance.id,feature)',tenantBranch);
    const strictDeny=resolver.indexOf('if(isStrictProOfficeFeature(feature))return false;',tenantGrant);
    const fallback=resolver.indexOf('return hasPlanFeature(await getCurrentPlan(),feature);',strictDeny);
    expect(tenantBranch).toBeGreaterThanOrEqual(0);
    expect(tenantGrant).toBeGreaterThan(tenantBranch);
    expect(strictDeny).toBeGreaterThan(tenantGrant);
    expect(fallback).toBeGreaterThan(strictDeny);
    expect(resolver.slice(tenantBranch,strictDeny)).toContain('return explicit?.enabled===true;');
  });
  it.each([
    'src/app/api/admin/office/email-attachments/prepare/route.ts',
    'src/app/api/admin/office/email-attachments/scan/route.ts',
    'src/app/api/admin/office/email-attachments/status/route.ts',
  ])('rejects Alap direct Office email attachment HTTP calls before tenant or database access: %s',(path)=>{
    const code=source(path);
    const base="hasCurrentPlanFeature('officeCommunication')";
    const advanced="hasCurrentPlanFeature('officeCommunicationAdvanced')";
    const pos=code.indexOf(advanced),scope=code.indexOf("requireCurrentStoreContext('support.manage')",code.indexOf('export async function'));
    expect(pos).toBeGreaterThan(0);
    expect(code).not.toContain(base);
    expect(scope).toBeGreaterThan(pos);
    expect(code.slice(pos,scope)).toContain('status:403');
    expect(code).toContain("getAdminRequestUser('support.manage')");
  });

  it('routes inbound/outbound Office email downloads through advanced Pro entitlement while preserving Team Chat security',()=>{
    const code=source('src/app/api/admin/office/attachments/[id]/route.ts');
    expect(code).toContain("source==='internal_upload'?'teamChatSecureAttachments'");
    expect(code).toContain("source==='provider_inbound'||source==='customer_outbound'?'officeCommunicationAdvanced':null");
    expect(code).toContain('hasCurrentPlanFeature(feature)');
    expect(code.indexOf('hasCurrentPlanFeature(feature)')).toBeLessThan(code.indexOf("db.rpc('admin_get_office_private_attachment_v1'"));
    expect(code).not.toContain("?'officeCommunication':null");
    expect(code).toContain('status:403');
  });

  it.each([
    ['src/app/admin/kommunikacio/iroda/actions.ts','async function supportAccess(){','async function privateChatAccess'],
    ['src/app/admin/kommunikacio/iroda/composer-actions.ts','async function access(){','function reasonFrom'],
    ['src/app/admin/kommunikacio/iroda/customer-read-actions.ts','export async function markCustomerThreadReadAction(', '  const db=createAdminClient();'],
  ] as const)('Pro-gates every direct Digital Office action helper before tenant or database access: %s',(path,opening,ending)=>{
    const file=source(path),begin=file.indexOf(opening);
    expect(begin).toBeGreaterThanOrEqual(0);
    const next=file.indexOf(ending,begin+opening.length);
    expect(next).toBeGreaterThan(begin);
    const entry=file.slice(begin,next);
    const base=entry.indexOf("await requirePlanFeature('officeCommunication')");
    const pro=entry.indexOf("await requirePlanFeature('officeCommunicationAdvanced')");
    const tenant=entry.indexOf('requireCurrentStoreContext');
    expect(base).toBeGreaterThanOrEqual(0);
    expect(pro).toBeGreaterThan(base);
    expect(tenant).toBeGreaterThan(pro);
    expect(entry).not.toMatch(/if\s*\([^)]*advanced\s*\)\s*await requirePlanFeature\('officeCommunicationAdvanced'\)/);
  });
  it('rejects Alap for shared Office actions even when the Pro layout is bypassed',()=>{
    const office=source('src/app/admin/kommunikacio/iroda/actions.ts');
    expect(office).not.toContain('supportAccess({advanced:true})');
    expect(office).toMatch(/async function supportAccess\(\)/);
    expect(office).toContain("await requirePlanFeature('teamChat')");
    expect(office).toContain('const{db,userId,instanceId,advancedEmail}=await supportAccess()');
    const composer=source('src/app/admin/kommunikacio/iroda/composer-actions.ts');
    expect(composer).toContain("const{db,userId,instanceId,advancedEmail}=await access()");
    expect(composer).not.toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
    const read=source('src/app/admin/kommunikacio/iroda/customer-read-actions.ts');
    expect(read).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(read.indexOf("requirePlanFeature('officeCommunicationAdvanced')")).toBeLessThan(read.indexOf("admin_mutate_office_privacy_v1"));
  });
  it.each(protectedPagesAndActions)('%s requires the expected Pro feature', (path, feature) => { const file=source(path); expect(file).toMatch(/requirePlanFeature/); expect(file).toContain(`requirePlanFeature('${feature}')`); });
  it('preserves ordinary Alap customer email while the Digital Office shell is Pro-only',()=>{
    const catalog=source('src/lib/plans/catalog.ts');
    const layout=source('src/app/admin/kommunikacio/layout.tsx');
    const actions=source('src/app/admin/kommunikacio/iroda/actions.ts');
    const suppression=source('src/app/api/admin/communication/suppression/route.ts');
    expect(catalog).toContain("'officeCommunicationAdvanced'");
    expect(layout).toContain("requirePlanFeature('officeCommunicationAdvanced')");expect(layout).not.toContain("requirePlanFeature('officeCommunication')");
    expect(actions).toContain("requirePlanFeature('officeCommunication')");
    expect(actions).toContain("requirePlanFeature('officeCommunicationAdvanced')");
    expect(suppression).toContain("hasCurrentPlanFeature('officeCommunication')");
    expect(suppression).not.toContain("hasCurrentPlanFeature('officeCommunicationAdvanced')");
  });
  it('keeps the action center Pro-gated from the authoritative entitlement decision used for UI access',()=>{
    const file=source('src/app/admin/intezkedesek/page.tsx');
    expect(file).toContain("getFeatureEntitlementDecision(currentInstance.id,'executiveAnalytics')");
    expect(file).toContain("const featureEnabled=entitlement?.enabled===true");
    expect(file).toContain('featureEnabled,canRead,canManage');
    expect(file).not.toContain("hasPlanFeature(currentInstance.subscriptionPlan,'executiveAnalytics')");
    expect(file).not.toContain("requirePlanFeature('executiveAnalytics')");
  });
  it.each(protectedApis)('%s rejects Alap through an API-safe feature check', (path, feature) => { const file=source(path); expect(file).toMatch(/hasCurrentPlanFeature/); expect(file).toContain(`hasCurrentPlanFeature('${feature}')`); expect(file).toMatch(/status:403/); });
  it('keeps platform assurance behind platform-operator access rather than a tenant plan gate',()=>{const file=source('src/app/admin/biztositekok/page.tsx');expect(file).toContain('requirePlatformOperator');expect(file).not.toContain("requirePlanFeature('executiveAnalytics')")});
  it('keeps standard commerce integrations in Alap while advanced operations remain Pro', () => { const catalog=source('src/lib/plans/catalog.ts'); expect(catalog).toContain("'commerceIntegrations'"); expect(catalog).toContain("'advancedIntegrations'"); const alapSection=catalog.slice(catalog.indexOf('const ALAP_FEATURES'),catalog.indexOf('const PRO_FEATURES')); expect(alapSection).toContain("'commerceIntegrations'"); expect(alapSection).not.toContain("'advancedIntegrations'"); });
  it('provides an API-safe entitlement-aware feature helper without redirect semantics', () => { const file=source('src/lib/plans/access.ts'); const helper=file.slice(file.indexOf('export async function hasCurrentPlanFeature'),file.indexOf('export async function requirePlanFeature')); expect(helper).toContain('getFeatureEntitlementDecision'); expect(helper).toContain('return explicit?.enabled===true'); expect(helper).toContain('return hasPlanFeature(await getCurrentPlan(),feature)'); expect(helper).not.toContain('return hasPlanFeature(instance.subscriptionPlan,feature)'); expect(helper).not.toContain('redirect('); });
  it('fails closed to Alap when no valid default plan is configured', () => { const file=source('src/lib/plans/access.ts'); expect(file).toContain("const fallback: PlanCode = isPlanCode(configuredDefault) ? configuredDefault : 'alap'"); expect(file).not.toContain("configuredDefault) ? configuredDefault : 'pro'"); });
});
