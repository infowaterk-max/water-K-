import {describe,it,expect} from 'vitest';
// @ts-expect-error Critical source-only review compiler is a JS ESM module.
import {CONTRACT,SCOPE,V2,V3,PRODUCTION_EXECUTION_AUTHORIZED,checkCandidateManifest,buildCandidateManifest,buildFinalAclProbe,validateFinalAcl} from '../scripts/shoperation-f6-u03l-release-candidate-acl.mjs';
// @ts-expect-error Immutable hosted SQL review compiler is JS ESM.
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';

const validAcl=()=>({contract:'shoporation.f6-u03l.native-pg17-final-function-acl.v1',rows:[
 {version:'v2',signature:V2,exists:true,securityDefiner:true,anon:false,authenticated:false,serviceRole:false,publicExecute:false},
 {version:'v3',signature:V3,exists:true,securityDefiner:true,anon:false,authenticated:false,serviceRole:true,publicExecute:false}
]});
describe('F6-U03l immutable 78-source review candidate and effective inbound function grants',()=>{
 it('pins all 78 source ordinals, immutable Git origins and non-release scope',()=>{
  const m=buildCandidateManifest();
  expect(m.contract).toBe(CONTRACT);
  expect(m.version).toBe('v0.1');
  expect(m.sources).toHaveLength(78);
  expect(m.sources.filter((x:{authority:string})=>x.authority==='reviewed-customer-baseline')).toHaveLength(59);
  expect(m.sources.filter((x:{authority:string})=>x.authority==='original-main-office-history')).toHaveLength(19);
  expect(m.sources.every((x:{gitBlob:string,sha256:string})=>/^[0-9a-f]{40}$/.test(x.gitBlob)&&/^[0-9a-f]{64}$/.test(x.sha256))).toBe(true);
  expect(m.candidateSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(m.releaseAuthorized).toBe(false);
  expect(m.hostedTouched).toBe(false);
  expect(m.signedInAlapProRlsProven).toBe(false);
  expect(checkCandidateManifest(m)).toBe(true);
 });
 it('keeps legacy v2 creator before v3 and true FK follow-up after 0057 before 0058',()=>{
  const rows=buildCandidateManifest().sources as {path:string,authority:string}[];
  const i=(name:string)=>rows.findIndex(x=>x.path.endsWith(name));
  expect(i('20260903180000_inbound_office_email_atomic_v2.sql')).toBeLessThan(i('20260908030000_digital_office_real_inbound_foundation_v1.sql'));
  expect(i('20260908030000_digital_office_real_inbound_foundation_v1.sql')).toBeLessThan(i('0055_communication_hub_2_0_foundation_v1.sql'));
  expect(i('0057_communication_hub_2_0_advanced_guards_and_object_links_v1.sql')).toBeLessThan(i('20260910070300_communication_hub_2_0_fk_indexes_v1.sql'));
  expect(i('20260910070300_communication_hub_2_0_fk_indexes_v1.sql')).toBeLessThan(i('0058_digital_office_plan_scoped_sql_guard_v2.sql'));
 });
 it('rejects unreviewed source reorder, forged SHA, duplicate and production approval',()=>{
  const m=buildCandidateManifest();
  expect(()=>checkCandidateManifest({...m,releaseAuthorized:true})).toThrow('F6U03L_CANDIDATE_NOT_PRODUCTION_AUTHORITY');
  expect(()=>checkCandidateManifest({...m,sources:m.sources.slice(1)})).toThrow('F6U03L_SOURCE_COUNT_OR_PROVENANCE_DRIFT');
  expect(()=>checkCandidateManifest({...m,sources:m.sources.map((v:{},i:number)=>i===40?{...v,gitBlob:'bad'}:v)})).toThrow('F6U03L_SOURCE_COUNT_OR_PROVENANCE_DRIFT');
  const changed=m.sources.map((v:{},i:number)=>i===40?{...v,ordinal:41,path:m.sources[39].path}:v);
  expect(()=>checkCandidateManifest({...m,sources:changed})).toThrow();
 });
 it('generates ONLY a read-only exact-signature native PostgreSQL ACL probe',()=>{
  const sql=buildFinalAclProbe();
  expect(sql).toContain(V2);
  expect(sql).toContain(V3);
  expect(sql).toContain("has_function_privilege('anon'");
  expect(sql).toContain("has_function_privilege('authenticated'");
  expect(sql).toContain("has_function_privilege('service_role'");
  expect(sql).toContain('aclexplode');
  expect(sql.toLowerCase()).not.toMatch(/\b(?:grant|revoke|drop|alter|insert|update|delete)\s+(?:all|on|table|function|into)\b/);
  expect(PRODUCTION_EXECUTION_AUTHORIZED).toBe(false);
 });
 it('accepts exact v2 all-role deny and v3 service-role-only, never calls that hosted ready',()=>{
  const p=validateFinalAcl(validAcl());
  expect(p.decision).toBe('LOCAL_NATIVE_ACL_VERIFIED_NOT_RELEASE');
  expect(p.v2DeniedToAllRuntimeRoles).toBe(true);
  expect(p.v3ServiceRoleOnly).toBe(true);
  expect(p.releaseAuthorized).toBe(false);
  expect(p.authenticatedTenantRlsProven).toBe(false);
 });
 it('fails closed on v2 legacy grant, v3 browser grant, PUBLIC, missing oid, wrong signature and non-definer',()=>{
  const mutate=(version:string,key:string,value:any)=>{
   const x=validAcl(),row=x.rows.find(z=>z.version===version) as any;
   row[key]=value;return x;
  };
  for(const x of [
   mutate('v2','serviceRole',true),mutate('v2','anon',true),mutate('v2','authenticated',true),
   mutate('v2','publicExecute',true),mutate('v3','anon',true),mutate('v3','authenticated',true),
   mutate('v3','publicExecute',true),mutate('v3','serviceRole',false),
   mutate('v2','exists',false),mutate('v3','exists',false),
   mutate('v2','signature','public.other(text)'),mutate('v3','securityDefiner',false)
  ]) expect(()=>validateFinalAcl(x)).toThrow('F6U03L_LEGACY_OR_BROWSER_EXECUTE_PRIVILEGE_DRIFT');
  expect(()=>validateFinalAcl({rows:[]})).toThrow('F6U03L_NOT_REAL_NATIVE_ACL_RESULT');
 });
 it('does not weaken the original hosted abort-before-DROP source authority',()=>{
  const g=compileAtomicReview();
  const abort=g.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  expect(g.executionEnabled).toBe(false);
  expect(abort).toBeGreaterThanOrEqual(0);
  expect(g.sql.indexOf('DROP SCHEMA private CASCADE;')).toBeGreaterThan(abort);
  expect(SCOPE).toBe('ORIGINAL_78_SOURCE_REVIEW_CANDIDATE_NOT_A_RELEASE');
 });
});
