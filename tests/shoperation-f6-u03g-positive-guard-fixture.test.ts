import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error Standalone .mjs safety harness intentionally has no ambient declarations.
import {SCOPE,HOSTED_EXECUTION_ENABLED,FIXTURE_DB,FIXTURE_SOURCE_SHA256,FIXTURE_CATALOGS,assertFixtureEnvironment,fixtureSetupSQL,compilePositiveFixtureGuard,runPositiveGuardFixture} from '../scripts/shoperation-f6-u03g-positive-guard-fixture.mjs';
// @ts-expect-error Previously verified production transaction source.
import {TRANSACTION_GUARD_SQL,NEUTRAL_ROWS} from '../scripts/shoperation-f6-u03f-target-transaction-guard.mjs';
// @ts-expect-error Previously reviewed 59-file source-only compiler.
import {compileAtomicReview} from '../scripts/shoperation-fresh-disposable-reprovision.mjs';

const safe={GITHUB_ACTIONS:'true',F6_U03G_EPHEMERAL:'yes',F6_U03G_DOCKER_IP:'172.18.0.2',PATH:'/usr/bin'};
describe('F6-U03g original guard positive fixture safety',()=>{
 it('pins fixture to one GitHub-only PostgreSQL17 Docker service, no general DB URL',()=>{
  expect(assertFixtureEnvironment(safe)).toEqual({db:FIXTURE_DB,host:'127.0.0.1',dockerIp:'172.18.0.2'});
  expect(()=>assertFixtureEnvironment({})).toThrow('F6U03G_EPHEMERAL_MARKER_REQUIRED');
  expect(()=>assertFixtureEnvironment({...safe,F6_U03G_DOCKER_IP:'8.8.8.8'})).toThrow('F6U03G_DOCKER_SERVICE_NOT_BOUND');
 });
 it.each(['PGHOST','PGHOSTADDR','PGSERVICE','PGDATABASE','PGOPTIONS','PGSSLMODE','DATABASE_URL','SUPABASE_DB_URL','SHOPERATION_FRESH_INSTALL_DB_URL'])(
  'rejects inherited database-selector %s',variable=>{
  expect(()=>assertFixtureEnvironment({...safe,[variable]:'postgres://wrong.example.com/postgres'})).toThrow('F6U03G_EXTERNAL_DATABASE_SELECTOR');
 });
 it('provisions exactly 175 public and 2 private fixture tables including seven neutral entitlement tables',()=>{
  const sql=fixtureSetupSQL();
  expect(FIXTURE_CATALOGS).toHaveLength(7);
  expect(FIXTURE_CATALOGS.reduce((n:number,x:{count:number})=>n+x.count,0)).toBe(113);
  expect([...sql.matchAll(/CREATE TABLE public\./g)]).toHaveLength(175);
  expect([...sql.matchAll(/CREATE TABLE private\./g)]).toHaveLength(2);
  expect(sql).toContain('CREATE TRIGGER on_auth_user_created');
  expect(sql).toContain('CREATE EVENT TRIGGER pgrst_ddl_watch');
  expect(sql).not.toMatch(/DROP SCHEMA (?:public|private|auth|storage)\b/i);
 });
 it('accepts only exact, individually enumerated 15 expected-value fixture substitutions',()=>{
  const fake={
   db:FIXTURE_DB,publicTables:175,privateTables:2,
   definitionCount:1000,definitionHash:'e'.repeat(32),
   catalogs:Object.fromEntries(Object.entries(NEUTRAL_ROWS as Record<string,[number,string]>).map(([n,[count]])=>[n,{count,md5:'1'.repeat(32)}])),
   eventHashes:Object.fromEntries(['issue_graphql_placeholder','issue_pg_cron_access','issue_pg_graphql_access','issue_pg_net_access','pgrst_ddl_watch','pgrst_drop_watch'].map(x=>[x,'2'.repeat(32)])),
  };
  const x=compilePositiveFixtureGuard(fake);
  expect(x.scope).toBe(SCOPE);
  expect(x.sourceGuardSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(x.sourceGuardSha256).toBe(FIXTURE_SOURCE_SHA256);
  expect(x.substitutions).toHaveLength(15);
  expect(x.substitutions.map((s:{id:string})=>s.id)).toContain('objectFingerprint');
  expect(x.sql).toContain('ACCESS EXCLUSIVE MODE NOWAIT');
  expect(x.sql).toContain('F6U03F_APPLICATION_USER_DATA_PRESENT');
  expect(x.sql).not.toContain('@@');
  expect(x.sql).not.toContain('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  expect(TRANSACTION_GUARD_SQL).toContain('catalog_items<>4621');
  expect(TRANSACTION_GUARD_SQL).toContain('e312b40ad91150ce937f4aa00db587f3');
 });
 it('refuses unknown or mismatched fixture data rather than suppressing guard',()=>{
  expect(()=>compilePositiveFixtureGuard({db:'postgres'})).toThrow('F6U03G_FIXTURE_OBSERVATION_INVALID');
  const fake={db:FIXTURE_DB,publicTables:175,privateTables:2,definitionCount:500,definitionHash:'f'.repeat(32),catalogs:{},eventHashes:{}};
  expect(()=>compilePositiveFixtureGuard(fake)).toThrow('F6U03G_CATALOG_OBSERVATION_DRIFT');
 });
 it('retains hard abort before DROP in reviewed source; fixture adapter is not used by hosted compiler',()=>{
  const s=compileAtomicReview(process.cwd());
  const guard=s.sql.indexOf('DO $f6_guard$');
  const fatal=s.sql.indexOf('FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED');
  const drop=s.sql.indexOf('DROP SCHEMA private CASCADE;');
  expect(s.executionEnabled).toBe(false);
  expect(guard).toBeGreaterThan(0);
  expect(fatal).toBeGreaterThan(guard);
  expect(drop).toBeGreaterThan(fatal);
  expect(s.sql).toContain(TRANSACTION_GUARD_SQL);
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
 });
 it('refuses a standalone hosted runner and never treats a missing marker as a positive DB proof',()=>{
  const z=spawnSync(process.execPath,['scripts/shoperation-f6-u03g-positive-guard-fixture.mjs','--execute'],{encoding:'utf8'});
  expect(z.status).not.toBe(0);
  expect(z.stderr).toContain('F6U03G_NO_HOSTED_DATABASE_EXECUTION');
  expect(()=>runPositiveGuardFixture({})).toThrow('F6U03G_EPHEMERAL_MARKER_REQUIRED');
 });
});
