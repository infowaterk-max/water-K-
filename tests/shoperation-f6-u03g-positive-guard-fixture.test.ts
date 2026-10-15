import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error Deliberately .mjs-only isolated PostgreSQL17 integration fixture.
import {DB,SCOPE,HOSTED_EXECUTION_ENABLED,FIXTURE_CATALOGS,setupSQL,guardSQL,validateEnvironment,runFixture} from '../scripts/shoperation-f6-u03g-positive-guard-fixture.mjs';
const good={GITHUB_ACTIONS:'true',F6_U03G_EPHEMERAL:'yes',F6_U03G_CONTAINER_IP:'172.18.0.2',PATH:'/usr/bin'};
describe('Core F6-U03g synthetic 177-table guard — limited assurance',()=>{
 it('cannot accidentally execute outside ephemeral GitHub Postgres',()=>{
  expect(validateEnvironment(good).database).toBe('f6_u03g_fixture');
  expect(()=>validateEnvironment({})).toThrow('F6U03G_NOT_EPHEMERAL');
  expect(()=>validateEnvironment({...good,F6_U03G_CONTAINER_IP:'8.8.8.8'})).toThrow('F6U03G_UNVERIFIED_DOCKER_IP');
 });
 it.each(['PGHOST','PGHOSTADDR','PGSERVICE','PGOPTIONS','PGPASSWORD','DATABASE_URL','SUPABASE_DB_URL','SHOPERATION_FRESH_INSTALL_DB_URL'])(
  'refuses database redirect %s',k=>{
   expect(()=>validateEnvironment({...good,[k]:'hosted.example.com'})).toThrow('F6U03G_DATABASE_SELECTOR_FORBIDDEN');
  }
 );
 it('requires exactly 175 synthetic public + 2 private relations and 7 neutral catalogs with 113 rows',()=>{
  expect(DB).toBe('f6_u03g_fixture');
  expect(FIXTURE_CATALOGS).toHaveLength(7);
  expect(FIXTURE_CATALOGS.reduce((s:number,v:{count:number})=>s+v.count,0)).toBe(113);
  const source=setupSQL();
  expect((source.match(/CREATE TABLE f6u03g_public\./g)||[]).length).toBe(175);
  expect((source.match(/CREATE TABLE f6u03g_private\./g)||[]).length).toBe(2);
  expect(source).toContain('f6u03g_meta.expected');
  expect(source).not.toContain('istjjkdcvsvilrycqecd');
 });
 it('checks every real table under transaction-local exclusive NOWAIT lock',()=>{
  const sql=guardSQL();
  expect(sql.trimStart()).toMatch(/^BEGIN;/);
  expect(sql.trimEnd()).toMatch(/COMMIT;$/);
  expect(sql).toContain('ACCESS EXCLUSIVE MODE NOWAIT');
  expect(sql).toContain('pg_try_advisory_xact_lock(118603,7)');
  expect(sql).toContain('F6U03G_RELATION_SET_CHANGED');
  expect(sql.indexOf('ACCESS EXCLUSIVE MODE NOWAIT')).toBeLessThan(sql.indexOf('F6U03G_NEUTRAL_HASH_DRIFT'));
 });
 it('rechecks each synthetic neutral row by stable whole-row hashes, not just counts',()=>{
  const sql=guardSQL();
  expect(sql).toContain('string_agg(to_jsonb(x)::text');
  expect(sql).toContain('ORDER BY to_jsonb(x)::text');
  expect(sql).toContain('found_hash<>baseline.expected_md5');
  expect(sql).toContain('F6U03G_NEUTRAL_HASH_DRIFT');
  expect(sql).toContain('F6U03G_USER_DATA_PRESENT');
  expect(sql).toContain('allowed<>113');
 });
 it('never drops or touches hosted public/private/Auth/Storage namespace',()=>{
  const sql=setupSQL()+'\n'+guardSQL();
  expect(sql).not.toMatch(/DROP SCHEMA (?:public|private|auth|storage|realtime)\b/i);
  expect(sql).not.toContain('DROP SCHEMA public CASCADE');
  expect(sql).not.toContain('supabase_migrations');
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
 });
 it('does not permit direct local invocation or a production migration',()=>{
  const x=spawnSync(process.execPath,['scripts/shoperation-f6-u03g-positive-guard-fixture.mjs','--execute'],{encoding:'utf8'});
  expect(x.status).not.toBe(0);
  expect(x.stderr).toContain('F6U03G_NO_HOSTED_EXECUTION');
  expect(()=>runFixture({})).toThrow('F6U03G_NOT_EPHEMERAL');
  expect(SCOPE).toBe('LOCAL_SYNTHETIC_177_TABLES_ONLY');
 });
});
