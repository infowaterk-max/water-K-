import{readFileSync}from'node:fs';import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(path,'utf8');
describe('Platform Incident Center',()=>{
 it('adds one platform navigation entry and keeps the route platform-operator only',()=>{
  const nav=read('src/lib/navigation/admin-ia.ts'),layout=read('src/app/admin/platform/incidents/layout.tsx'),page=read('src/app/admin/platform/incidents/page.tsx');
  expect(nav.match(/platform-incidents/g)?.length).toBe(1);
  expect(nav).toContain("href:'/admin/platform/incidents'");
  expect(layout).toContain('requirePlatformOperator');
  expect(page).toContain('requirePlatformOperator');
  expect(page).toContain('PlatformIncidentCenter');
 });
 it('uses the canonical incident queue and triage APIs instead of direct client database writes',()=>{
  const ui=read('src/components/admin/platform-incident-center.tsx');
  expect(ui).toContain("fetch('/api/platform/incidents?limit=200'");
  expect(ui).toContain('/triage');
  expect(ui).toContain('/repair');
  expect(ui).toContain('ShoperationDialog');
  expect(ui).not.toMatch(/from\(['"]platform_incidents['"]\)/);
  expect(ui).not.toContain('createAdminClient');
 });
 it('keeps repair initiation proposal-only and platform authenticated',()=>{
  const route=read('src/app/api/platform/incidents/[id]/repair/route.ts'),service=read('src/lib/incidents/service.ts');
  expect(route).toContain('getPlatformRequestUser');
  expect(route).toContain('isSameOrigin');
  expect(route).toContain('createPlatformRepairProposal');
  expect(route).not.toContain("requestedMode:'auto'");
  expect(service).toContain("requestedMode:'propose'");
  expect(service).toContain("createdByKind:'platform'");
  expect(service).toContain("source:'platform-incident-center'");
  expect(service).toContain("['resolved','closed','rejected']");
 });
 it('exposes code repair only as branch / PR proposal and never direct auto apply',()=>{
  const ui=read('src/components/admin/platform-incident-center.tsx'),policy=read('src/lib/incidents/self-healing.ts');
  expect(ui).toContain("'code.repair.pr'");
  expect(ui).toContain('közvetlen production');
  expect(ui).toContain("body.mode!=='propose'");
  expect(ui).toContain('body.autoApply!==false');
  expect(policy).toContain("allowedModes:['propose']");
  expect(policy).toContain("repairKind:'code_pr'");
  expect(policy).toContain('autoAllowed:false');
 });
 it('supports audit triage, filters and Known Failure linkage',()=>{
  const ui=read('src/components/admin/platform-incident-center.tsx');
  expect(ui).toContain('PLATFORM_MANUAL_REVIEW');
  expect(ui).toContain('knownFailureId');
  expect(ui).toContain('ownership_reason_code');
  expect(ui).toContain('triage_confidence');
  expect(ui).toContain('Known Failure');
  expect(ui).toContain('Besorolás mentése');
 });
});
