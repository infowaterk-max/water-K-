import {describe,it,expect} from 'vitest';
// @ts-expect-error F6-U03n JS ESM local-only fixture discovery.
import {CONTRACT,REQUIRES,generateReadOnlySchemaSQL,evaluateDiscovery,localRoleSmokeSql,validateRoleSmoke,TENANT_IDS,twoTenantSeedSql,tenantRowProbeSql,validateTenantRowProbe} from '../scripts/shoperation-f6-u03n-tenant-role-rehearsal.mjs';
// @ts-expect-error F6-U03l source candidate JS ESM.
import {buildCandidateManifest} from '../scripts/shoperation-f6-u03l-release-candidate-acl.mjs';
const good=()=>({contract:CONTRACT,database:'f6_u03i_fresh',pgMajor:17,
 tables:REQUIRES.map((name:string)=>({name,exists:true})),
 columns:REQUIRES.map((name:string)=>({table_name:name,name:'id',sql_type:'uuid',required:true,default_sql:null})),
 constraints:[],authUidDefinition:'CREATE FUNCTION auth.uid() AS SELECT NULL::uuid;',
 authJwtDefinition:'CREATE FUNCTION auth.jwt() AS SELECT \'{}\'::jsonb;',
 anonBypass:false,authenticatedBypass:false});
describe('F6-U03n original-source two-tenant fixture discovery fails closed',()=>{
 it('hard-fails on real SQL row mismatches, all-zero fake positives and leaked foreign tenant IDs',()=>{
  const fixture=twoTenantSeedSql(),roleSql=tenantRowProbeSql();
  expect(fixture).toContain('F6U03N_POSITIVE_TENANT_SEED_MISSING');
  expect(fixture).toContain("('bbbbbbbb-0000-4000-8000-000000000002'");
  expect(fixture).toContain("'alap'");
  expect(fixture).toContain("'pro'");
  expect(fixture).toContain("'teamChat','manual',true");
  expect(roleSql).toContain('SET LOCAL ROLE authenticated;');
  const log=[
   {case:'A_owner',role:'authenticated',sub:TENANT_IDS.AUser,bypass:false,threads:[TENANT_IDS.ACustomer],messages:1,tasks:1},
   {case:'B_owner',role:'authenticated',sub:TENANT_IDS.BUser,bypass:false,threads:[TENANT_IDS.BCustomer,TENANT_IDS.BInternal].sort(),messages:2,tasks:2},
   {case:'stranger',role:'authenticated',sub:TENANT_IDS.Stranger,bypass:false,threads:[],messages:0,tasks:0}
  ].map(x=>'F6U03N_TENANT='+JSON.stringify(x)).join('\n');
  const ok=validateTenantRowProbe(log);
  expect(ok.localTenantPositiveNegativeProven).toBe(true);
  expect(ok.signedSupabaseJwtProven).toBe(false);
  expect(()=>validateTenantRowProbe(log.replace(TENANT_IDS.ACustomer,TENANT_IDS.BCustomer)))
   .toThrow('F6U03N_ACTUAL_ALAP_PRO_TENANT_RLS_ASSERTION_FAILED');
  expect(()=>validateTenantRowProbe(log.replace('"messages":1','"messages":0')))
   .toThrow('F6U03N_ACTUAL_ALAP_PRO_TENANT_RLS_ASSERTION_FAILED');
  expect(()=>validateTenantRowProbe(log.split('\n').slice(0,2).join('\n')))
   .toThrow('F6U03N_MISSING_POSITIVE_OR_NEGATIVE_TENANT_ROLE_CASE');
 });
 it('local-only role smoke rejects all-zero, forged user, bypass and missing anonymous negative',()=>{
  const sql=localRoleSmokeSql();
  expect(sql).toContain('SET LOCAL ROLE authenticated;');
  expect(sql).toContain('SET LOCAL ROLE anon;');
  expect(sql).toContain("current_setting('request.jwt.claim.sub',true)");
  expect(sql).toContain("F6U03N_WRONG_LOCAL_ROLE_TARGET");
  const a='F6U03N_ROLE='+JSON.stringify({case:'authenticated',role:'authenticated',user:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bypass:false,jwt:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  const n='F6U03N_ROLE='+JSON.stringify({case:'anon',role:'anon',user:null,bypass:false});
  expect(validateRoleSmoke(a+'\n'+n).actualRoleCases).toBe(2);
  expect(()=>validateRoleSmoke(a)).toThrow('F6U03N_POSITIVE_NEGATIVE_ROLE_SMOKE_MISSING');
  expect(()=>validateRoleSmoke(a.replace('"bypass":false','"bypass":true')+'\n'+n)).toThrow('F6U03N_LOCAL_AUTH_ROLE_STATE_MISMATCH');
 });

 it('uses SELECT only for original schema/constraint/Auth stub discovery',()=>{
  const s=generateReadOnlySchemaSQL();
  expect(s).toContain('pg_attribute');
  expect(s).toContain('pg_constraint');
  expect(s).toContain("pg_get_functiondef('auth.uid()'::regprocedure)");
  expect(s).toContain('rolbypassrls');
  expect(s.toLowerCase()).not.toMatch(/\b(?:insert into|drop schema|update public|create role|alter table|grant execute)\b/);
 });
 it('labels original null-auth fixture honestly: not RLS proof nor signed Supabase JWT',()=>{
  const m=buildCandidateManifest(),r=evaluateDiscovery(good(),m);
  expect(r.sourceCount).toBe(78);
  expect(r.localAuthUidReturnsNull).toBe(true);
  expect(r.localTenantPositiveNegativeProven).toBe(false);
  expect(r.realSignedSupabaseJwtProven).toBe(false);
  expect(r.releaseAuthorized).toBe(false);
  expect(r.hostedTouched).toBe(false);
  expect(r.decision).toBe('LOCAL_SCHEMA_DISCOVERED_TENANT_RLS_NOT_PROVEN');
 });
 it('fails on missing tables, wrong role, non-null stub and forged source',()=>{
  const m=buildCandidateManifest();
  const fail=(x:any,msg='F6U03N_INCOMPLETE_SCHEMA_OR_NULL_SHIM_MISSING')=>
   expect(()=>evaluateDiscovery(x,m)).toThrow(msg);
  fail({...good(),database:'production'});
  fail({...good(),pgMajor:16});
  fail({...good(),authenticatedBypass:true});
  fail({...good(),tables:good().tables.slice(1)});
  fail({...good(),authUidDefinition:'SELECT current_setting(\'request.jwt.claim.sub\')'});
  expect(()=>evaluateDiscovery(good(),{...m,releaseAuthorized:true})).toThrow();
 });
});
