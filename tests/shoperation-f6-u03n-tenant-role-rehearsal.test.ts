import {describe,it,expect} from 'vitest';
// @ts-expect-error F6-U03n JS ESM local-only fixture discovery.
import {CONTRACT,REQUIRES,generateReadOnlySchemaSQL,evaluateDiscovery} from '../scripts/shoperation-f6-u03n-tenant-role-rehearsal.mjs';
// @ts-expect-error F6-U03l source candidate JS ESM.
import {buildCandidateManifest} from '../scripts/shoperation-f6-u03l-release-candidate-acl.mjs';
const good=()=>({contract:CONTRACT,database:'f6_u03i_fresh',pgMajor:17,
 tables:REQUIRES.map((name:string)=>({name,exists:true})),
 columns:REQUIRES.map((name:string)=>({table_name:name,name:'id',sql_type:'uuid',required:true,default_sql:null})),
 constraints:[],authUidDefinition:'CREATE FUNCTION auth.uid() AS SELECT NULL::uuid;',
 authJwtDefinition:'CREATE FUNCTION auth.jwt() AS SELECT \'{}\'::jsonb;',
 anonBypass:false,authenticatedBypass:false});
describe('F6-U03n original-source two-tenant fixture discovery fails closed',()=>{
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
