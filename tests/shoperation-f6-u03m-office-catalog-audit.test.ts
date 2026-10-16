import {describe,it,expect} from 'vitest';
// @ts-expect-error Native Docker PostgreSQL17 read-only catalog diagnostic JS ESM.
import {CONTRACT,SCOPE,nativeCatalogSQL,validateCatalog,findOfficeRisks,reportCatalog} from '../scripts/shoperation-f6-u03m-office-catalog-audit.mjs';
// @ts-expect-error Source-pinned original SQL review manifest JS ESM.
import {buildCandidateManifest} from '../scripts/shoperation-f6-u03l-release-candidate-acl.mjs';
const b={rls_enabled:true,force_rls:false,anon_select:false,auth_select:false,
 anon_insert:false,auth_insert:false,anon_update:false,auth_update:false,anon_delete:false,auth_delete:false};
const f={security_definer:false,body_touches_office:false,anon_execute:false,
 auth_execute:false,service_execute:false,public_execute:false};
function fixture(){
 const relations=Array.from({length:190},(_,i)=>({name:i===0?'public.office_mailboxes':'public.table_'+i,schema:'public',...b}));
 const functions=Array.from({length:379},(_,i)=>({name:'public.function_'+i+'()',schema:'public',...f}));
 functions[0]={...functions[0],name:'public.record_inbound_office_email_v2(text, text, text, text, text)',
  security_definer:true,body_touches_office:true};
 functions[1]={...functions[1],name:'public.record_inbound_office_email_v3(text, text, text, text, text, uuid, text, text, text, text[], integer)',
  security_definer:true,body_touches_office:true,service_execute:true};
 const policies=Array.from({length:129},(_,i)=>({table_name:i===0?'public.office_mailboxes':'public.table_'+(i+1),
  name:'policy_'+i,command:'r',permissive:true,using_expr:'true',check_expr:null,roles:['authenticated']}));
 const triggers=[{table_name:'public.office_mailboxes',name:'trigger_office',enabled:'O',definition:'CREATE TRIGGER trigger_office...'}];
 return {contract:CONTRACT,relations,functions,policies,triggers};
}
describe('F6-U03m real PostgreSQL catalog-wide Office audit',()=>{
 it('emits only READ ONLY PostgreSQL pg_catalog statements with policy expressions and effective roles',()=>{
  const s=nativeCatalogSQL();
  expect(s).toContain('pg_policy');
  expect(s).toContain('pg_get_expr');
  expect(s).toContain('pg_trigger');
  expect(s).toContain('has_function_privilege');
  expect(s).toContain('aclexplode');
  expect(s).toContain('has_table_privilege');
  expect(s).toContain("n.nspname IN ('public','private')");
  expect(s).not.toMatch(/\b(?:DROP SCHEMA|CREATE TABLE|ALTER TABLE|GRANT EXECUTE|REVOKE ALL|DELETE FROM)\b/i);
 });
 it('validates complete native catalog and keeps existing inbound v2/v3 effective ACL authority',()=>{
  expect(validateCatalog(fixture())).toBe(true);
  const x=fixture();
  (x.functions[0] as any).service_execute=true;
  expect(()=>validateCatalog(x)).toThrow('F6U03M_INBOUND_ACL_REGRESSION');
 });
 it('blocks absent, shortened or malformed snapshots, not false-green output',()=>{
  expect(()=>validateCatalog(null)).toThrow('F6U03M_INVALID_CATALOG');
  const x=fixture();x.policies.pop();
  expect(()=>validateCatalog(x)).toThrow('F6U03M_INCOMPLETE_CATALOG');
  const y=fixture();(y.relations[0] as any).anon_select='yes';
  expect(()=>validateCatalog(y)).toThrow('F6U03M_CATALOG_FIELD_DRIFT');
 });
 it('emits review findings for browser grants, RLS-disabled tables and exposed SECURITY DEFINER',()=>{
  const x=fixture();x.relations[0].rls_enabled=false;x.relations[0].anon_select=true;
  x.functions[2]={...x.functions[2],name:'public.office_unchecked_rpc()',body_touches_office:true,
   security_definer:true,anon_execute:true,public_execute:true};
  const risks=findOfficeRisks(x);
  expect(risks.map((z:any)=>z.rule)).toContain('OFFICE_RLS_DISABLED');
  expect(risks.map((z:any)=>z.rule)).toContain('OFFICE_BROWSER_TABLE_GRANT');
  expect(risks.map((z:any)=>z.rule)).toContain('OFFICE_EXPOSED_SECURITY_DEFINER');
  expect(risks.find((z:any)=>z.rule==='OFFICE_EXPOSED_SECURITY_DEFINER').priority).toBe('high');
 });
 it('review-flags UPDATE without explicit WITH CHECK but does not assert exploitable bypass',()=>{
  const x=fixture();
  x.policies[0]={...x.policies[0],command:'w',check_expr:null,roles:['PUBLIC']};
  x.triggers[0].enabled='D';
  const risk=findOfficeRisks(x);
  expect(risk.map((z:any)=>z.rule)).toContain('OFFICE_UPDATE_CHECK_REVIEW');
  expect(risk.map((z:any)=>z.rule)).toContain('OFFICE_PUBLIC_POLICY_REVIEW');
  expect(risk.map((z:any)=>z.rule)).toContain('OFFICE_TRIGGER_NOT_ALWAYS_ON');
  expect(risk.every((z:any)=>z.semanticReviewRequired===true)).toBe(true);
 });
 it('requires original source provenance and remains review-blocked even if all findings cleared',()=>{
  const x=fixture();
  const m=buildCandidateManifest();
  const report=reportCatalog(x,m);
  expect(report.decision).toBe('OFFICE_CATALOG_REVIEW_REQUIRED_NOT_RELEASE');
  expect(report.releaseAuthorized).toBe(false);
  expect(report.hostedTouched).toBe(false);
  expect(report.signedInAlapProRlsProven).toBe(false);
  expect(report.semanticReviewComplete).toBe(false);
  expect(report.sourceCount).toBe(78);
  expect(report.counts.relations).toBe(190);
  expect(report.scope).toBe(SCOPE);
  expect(()=>reportCatalog(x,{...m,releaseAuthorized:true})).toThrow();
  const y=fixture();y.relations[0].name='public.unrelated_fixture';
  y.functions[0].body_touches_office=false;
  y.functions[1].body_touches_office=false;
  expect(()=>reportCatalog(y,m)).toThrow('F6U03M_NO_OFFICE_OBJECTS');
 });
});
