import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error Deliberately JS-only fixture harness with no ambient ts declaration.
import {
 PROOF_SCOPE,FIXTURE_DB,HOSTED_EXECUTION_ENABLED,HISTORICAL_FINGERPRINT,
 historicalSource,bootstrapSql,applicationFingerprintSql,positiveApplicationPreflightSql,
 assertLocalFixture,runHistoricalProof,
} from '../scripts/shoperation-f6-u03g-historical-replay.mjs';
const safe={GITHUB_ACTIONS:'true',F6_U03G_EPHEMERAL:'yes',F6_U03G_POSTGRES_CONTAINER_IP:'172.18.0.2',PATH:'/usr/bin'};
describe('Core F6-U03g historical 0046 local replay source and boundary',()=>{
 it('selects all 47 real migration files through 0046 from a 59-file immutable source',()=>{
  const list=historicalSource();
  expect(list.currentCount).toBe(59);
  expect(list.historicalCount).toBe(47);
  expect(list.paths[0]).toContain('0001_shoperation_v1_schema.sql');
  expect(list.paths.at(-1)).toContain('0046_alap_team_chat_plan_grant_reconcile.sql');
  expect(list.paths.filter((s:string)=>s.split('/').at(-1)!.startsWith('0026_'))).toHaveLength(2);
  expect(list.paths.some((s:string)=>s.includes('0047_'))).toBe(false);
 });
 it('pins historical object checksum to previously read-only hosted reference and never claims hosted execution',()=>{
  expect(HISTORICAL_FINGERPRINT).toBe('e312b40ad91150ce937f4aa00db587f3');
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
  expect(PROOF_SCOPE).toBe('HISTORICAL_0046_LOCAL_POSTGRES17_ONLY');
  expect(FIXTURE_DB).toBe('f6_u03g_fixture');
 });
 it('binds subprocess to the exact Docker IP/DB and rejects wrong target',()=>{
  expect(assertLocalFixture(safe)).toMatchObject({database:'f6_u03g_fixture',host:'127.0.0.1'});
  expect(()=>assertLocalFixture({})).toThrow('F6U03G_NOT_CI_EPHEMERAL');
  expect(()=>assertLocalFixture({...safe,F6_U03G_POSTGRES_CONTAINER_IP:'192.0.2.3'})).toThrow('F6U03G_UNBOUND_DOCKER_POSTGRES');
 });
 it.each(['PGHOSTADDR','PGHOST','PGPORT','PGDATABASE','PGOPTIONS','PGSERVICE','DATABASE_URL','SHOPERATION_FRESH_INSTALL_DB_URL','SUPABASE_DB_URL'])(
 'blocks inherited Postgres or hosted selector %s',name=>{
  expect(()=>assertLocalFixture({...safe,[name]:'external.example'})).toThrow('F6U03G_EXTERNAL_CONNECTION_SELECTOR');
 });
 it('keeps compatibility shims outside public/private app schemas',()=>{
  const sql=bootstrapSql();
  expect(sql).toContain('CREATE TABLE auth.users');
  expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions');
  expect(sql).toContain('CREATE TABLE storage.buckets');
  expect(sql).not.toMatch(/DROP SCHEMA\s+(?:public|private|auth|storage)/i);
  expect(sql).not.toContain('istjjkdcvsvilrycqecd');
 });
 it('reuses original F6-U03f 4621-object fingerprint projection rather than a count-only imitation',()=>{
  const sql=applicationFingerprintSql();
  expect(sql).toContain('pg_get_functiondef(p.oid)');
  expect(sql).toContain('pg_get_triggerdef(t.oid)');
  expect(sql).toContain('FROM pg_policy');
  expect(sql).toContain('FROM pg_constraint');
  expect(sql).toContain('md5(string_agg(');
 });
 it('locks every application table and refuses non-neutral user rows',()=>{
  const sql=positiveApplicationPreflightSql();
  expect(sql).toContain('ACCESS EXCLUSIVE MODE NOWAIT');
  expect(sql).toContain('F6U03G_CUSTOMER_ROW_PRESENT');
  expect(sql).toContain('F6U03G_AUTH_NOT_EMPTY');
  expect(sql).toContain('F6U03G_TABLE_SET_MISMATCH');
  expect(sql).toContain('F6U03G_NEUTRAL_DRIFT:plan_capability_grants');
  expect(sql.trimStart().startsWith('BEGIN;')).toBe(true);
  expect(sql.trimEnd().endsWith('ROLLBACK;')).toBe(true);
 });
 it('does not expose a direct execution flag or any hosting migration mode',()=>{
  const x=spawnSync(process.execPath,['scripts/shoperation-f6-u03g-historical-replay.mjs','--execute'],{encoding:'utf8'});
  expect(x.status).not.toBe(0);expect(x.stderr).toContain('F6U03G_LOCAL_FIXTURE_ONLY');
  expect(()=>runHistoricalProof({})).toThrow('F6U03G_NOT_CI_EPHEMERAL');
 });
});
