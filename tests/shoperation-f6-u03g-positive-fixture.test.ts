import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
// @ts-expect-error Explicitly JS-only offline fixture assembler, no database client.
import{SCOPE,HOSTED_EXECUTION_ENABLED,EXPECTED,selectHistorical0046,buildReplay,fixtureBootstrapSql,classifyFixtureResult}from'../scripts/shoperation-f6-u03g-positive-fixture.mjs';

const get=()=>selectHistorical0046(process.cwd());
describe('F6-U03g historical 0046 real-replay source integrity',()=>{
 it('chooses precisely 47 immutable 0001–0046 sources, including both 0026 migrations',()=>{
  const s=get();
  expect(s.files).toHaveLength(47);
  expect(s.files.filter((f:{path:string})=>f.path.includes('/0026_'))).toHaveLength(2);
  expect(s.files[0].path).toContain('/0001_');
  expect(s.files.at(-1).path).toContain('/0046_');
  expect(s.files.some((f:{path:string})=>/\/00(4[7-9]|5[0-8])_/.test(f.path))).toBe(false);
 });
 it('retains all source paths and produces a deterministic strong digest',()=>{
  const a=get(),b=get();
  expect(a.sourceSetSha256).toBe(b.sourceSetSha256);
  expect(a.sourceSetSha256).toMatch(/^[a-f0-9]{64}$/);
  for(const source of a.files){
   expect(source.hash).toMatch(/^[a-f0-9]{64}$/);
   expect(readFileSync(source.path,'utf8')).toBe(source.sql);
  }
 });
 it('packs all 47 original migrations in order, Auth bootstrap + empty seed into one transaction',()=>{
  const b=buildReplay();
  expect(b.count).toBe(47);
  expect(b.sql).toContain('BEGIN;');
  expect(b.sql.trimEnd().endsWith('COMMIT;')).toBe(true);
  expect(b.sql).toContain("F6U03G_WRONG_LOCAL_TARGET");
  expect(b.sql).toContain('on_auth_user_created');
  expect(b.sql).toContain('Shoperation customer baseline: no customer-specific seed data loaded.');
  let pos=-1;
  for(const f of b.files){
   const next=b.sql.indexOf('-- source '+f.path);
   expect(next).toBeGreaterThan(pos);pos=next;
  }
  expect(b.sql).not.toContain('-- source supabase/customer-baseline/migrations/0047_');
  expect(b.sql).not.toContain('-- source supabase/customer-baseline/migrations/0058_');
 });
 it('uses explicit fixture-only database, managed-shim roles, auth schema and provider boundary',()=>{
  const a=fixtureBootstrapSql();
  expect(a).toContain("current_database()<>'f6_u03g_fixture'");
  expect(a).toContain('CREATE TABLE auth.users');
  expect(a).toContain('CREATE SCHEMA extensions');
  expect(a).toContain('CREATE ROLE service_role NOLOGIN;');
  expect(a).toContain('CREATE ROLE anon NOLOGIN;');
  expect(SCOPE).toBe('LOCAL_HISTORICAL_0046_ONLY');
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
 });
 it('never accepts false positive source-only, skipped or mocked fixture outputs',()=>{
  for(const report of [undefined,{},{actual47Committed:false,realPostgres17:true,sourceCount:47},
    {actual47Committed:true,realPostgres17:false,sourceCount:47}])
   expect(()=>classifyFixtureResult(report)).toThrow('F6U03G_NO_REAL_REPLAY_PROOF');
 });
 it('refuses to mark exact guard PASS without canonical hash and counts',()=>{
  const input={actual47Committed:true,realPostgres17:true,sourceCount:47,
   publicTables:175,privateTables:2,publicFunctions:344,publicPolicies:126,
   definitionCount:4620,definitionMd5:'notcanonical',fullGuardVerdict:'PASS'};
  expect(()=>classifyFixtureResult(input)).toThrow('F6U03G_FALSE_POSITIVE_GUARD');
 });
 it('keeps full guard BLOCKED on fixture dependency/hash mismatch even if schema counts match',()=>{
  const input={actual47Committed:true,realPostgres17:true,sourceCount:47,
   publicTables:175,privateTables:2,publicFunctions:344,publicPolicies:126,
   definitionCount:4621,definitionMd5:'different',fullGuardVerdict:'BLOCKED'};
  const a=classifyFixtureResult(input);
  expect(a.structuralParity).toBe('PASS');
  expect(a.schemaFingerprintParity).toBe('BLOCKED');
  expect(a.exactGuardPositive).toBe('BLOCKED');
  expect(a.hostedDatabaseTouched).toBe(false);
  expect(a.hosted59MigrationsApplied).toBe(0);
  expect(a.alapProSignedInRlsProved).toBe(false);
 });
 it('accepts exact full-positive verdict only when all immutable guard conditions are met',()=>{
  const a=classifyFixtureResult({actual47Committed:true,realPostgres17:true,sourceCount:47,
   publicTables:EXPECTED.publicTables,privateTables:EXPECTED.privateTables,
   publicFunctions:EXPECTED.publicFunctions,publicPolicies:EXPECTED.publicPolicies,
   definitionCount:EXPECTED.definitionCount,definitionMd5:EXPECTED.definitionMd5,
   fullGuardVerdict:'PASS'});
  expect(a.exactGuardPositive).toBe('PASS');
  expect(a.hostedDatabaseTouched).toBe(false);
 });
});
