import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
const read=(f:string)=>readFileSync(f,'utf8');
const roadmap=JSON.parse(read('quality/knowledge/living-roadmap.v2.json'));
const matrix=roadmap.items.find((x:any)=>x.id==='MR1-PACKAGE-CAPABILITY-MATRIX');
const b2b=roadmap.items.find((x:any)=>x.id==='B2B-MATURITY');
const doc=read('docs/architecture/SHOPERATION_PRODUCT_DECISION_RECONCILIATION_20261010.md');
const strings=(items:string[])=>items.join(' ').toLowerCase();
describe('Core #1186 F24 accepted Product Owner Alap-simple B2B/Pro-advanced decision reconciliation',()=>{
 it('preserves one canonical roadmap with accepted decision coverage, item identities and maturity gates',()=>{
  expect(roadmap.contract).toBe('shoporation.living-roadmap.v2');
  expect(roadmap.status).toBe('canonical');
  expect(roadmap.principles.laterAcceptedDecisionSupersedesOlderNarrativeOrdering).toBe(true);
  expect(roadmap.principles.noSilentCompletion).toBe(true);
  expect(roadmap.items.length).toBe(67);
  expect(new Set(roadmap.items.map((x:any)=>x.id)).size).toBe(67);
  expect(matrix.status).toBe('accepted');
  expect(b2b.status).toBe('hardening');
  expect(doc).toContain('Single canonical source of truth');
 });
 it('reflects accepted Alap simple partner onboarding, groups, standard prices and MOQ without Office',()=>{
  const alap=strings(matrix.packageMatrix.alap.capabilities);
  for(const phrase of ['simple b2b partner registration','merchant approval','partner groups','partner/reseller prices','minimum-order quantity','order-multiple','no pro communications workspace required']){
    expect(alap).toContain(phrase);
  }
  expect(strings(matrix.scope)).toContain('alap includes a fully functional simple b2b baseline');
  expect(strings(b2b.scope)).toContain('alap b2b is an independent functional baseline');
 });
 it('includes a simple Alap RFQ→merchant offer→acceptance→order path independent of Digital Office',()=>{
  const alap=strings(matrix.packageMatrix.alap.capabilities);
  for(const phrase of ['simple b2b rfq/ajánlatkérés','pdp request','merchant basic response/offer','buyer offer acceptance','conversion to order','independent of pro communications workspace']){
   expect(alap).toContain(phrase);
  }
  expect(strings(matrix.scope)).toContain('simple pdp rfq');
  expect(strings(b2b.scope)).toContain('basic rfq-to-merchant-offer-to-order');
 });
 it('keeps Pro advanced contract pricing, multi-actor B2B governance and approvals as genuine additional capability',()=>{
  const pro=strings(matrix.packageMatrix.pro.capabilities);
  for(const phrase of ['advanced b2b company accounts','multiple company users','complex and contractual b2b price lists','negotiated multi-stage offer','governed acceptance','spending','credit','maker-checker']){
   expect(pro).toContain(phrase);
  }
  expect(strings(matrix.scope)).toContain('pro adds complex company-account multi-user governance');
  expect(pro).toContain('simple independent rfq and basic offer/order path remain alap');
  expect(strings(b2b.scope)).toContain('pro b2b adds verified multi-user company');
 });
 it('does NOT silently grant Pro Digital Office, Team Chat or advanced commerce to Alap',()=>{
  expect(strings(matrix.scope)).toContain('digital office is wholly pro-only');
  expect(strings(matrix.packageMatrix.explicitExclusionsFromAlap)).toContain('digital office team chat');
  expect(strings(matrix.packageMatrix.explicitExclusionsFromAlap)).toContain('full b2b organizational purchasing governance');
  expect(strings(matrix.packageMatrix.pro.capabilities)).toContain('digital office');
  expect(strings(matrix.packageMatrix.pro.capabilities)).toContain('guided finder');
  expect(strings(matrix.packageMatrix.alap.capabilities)).not.toContain('digital office team chat');
 });
 it('records accepted Trial/account/domain/archive decisions as UNSYNCED and the repeat-pause question as OPEN',()=>{
  for(const phrase of ['Trial: 1 webshop','+10,000 HUF','+15,000 HUF','30 days','91–365','only a \`*.shoperation.hu\` subdomain','Agency: unlimited shops']){
    expect(doc).toContain(phrase);
  }
  expect(doc).toContain('**OPEN – do not encode rule or automatic lifecycle action**');
  expect(doc).toContain('not applied to runtime or roadmap commercial policy in F24');
 });
 it('fails completion overclaim: runtime grants, full RFQ dependencies and native Supabase remain separate BLOCKED work',()=>{
  expect(doc).toContain('plan_capability_grants');
  expect(doc).toContain('quote acceptance→order');
  expect(doc).toContain('actual Fresh Install');
  expect(doc).toContain('No hosted Supabase target');
  expect(doc).toContain('Decision synchronized ≠ feature implemented');
  expect(doc).toContain('runtime implementation remains BLOCKED');
 });
});
