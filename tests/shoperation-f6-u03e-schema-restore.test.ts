import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error The isolated .mjs safety fixture deliberately has no ambient type declarations.
import{SCOPE,HOSTED_EXECUTION_ENABLED,FIXTURE_DB,FAULTS,SUPABASE_PROVIDER_FUNCTION_MD5,verifyEphemeral,regrantSQL,setupSQL,replaySQL,statusSQL,runFixture}from'../scripts/shoperation-f6-u03e-schema-restore.mjs';
const env={GITHUB_ACTIONS:'true',F6_U03E_EPHEMERAL:'yes',F6_U03E_CONTAINER_IP:'172.18.0.2',PATH:'/usr/bin'};
describe('F6-U03e isolated PG17 schema grants + event callback',()=>{
 it('allows only exact ephemeral environment and independently supplied private Docker IP',()=>{
  expect(verifyEphemeral(env).db).toBe('f6_u03e_fixture');
  expect(()=>verifyEphemeral({})).toThrow('F6U03E_NOT_EPHEMERAL');
  expect(()=>verifyEphemeral({...env,F6_U03E_CONTAINER_IP:'8.8.8.8'})).toThrow('F6U03E_UNBOUND_POSTGRES_CONTAINER');
 });
 it.each(['PGHOSTADDR','PGSERVICE','PGOPTIONS','PGDATABASE','PGPASSWORD','DATABASE_URL','SHOPERATION_FRESH_INSTALL_DB_URL','SUPABASE_DB_URL'])(
 'blocks inherited redirect or cloud secret %s',name=>{
  expect(()=>verifyEphemeral({...env,[name]:'external'})).toThrow('F6U03E_EXTERNAL_DATABASE_SELECTOR');
 });
 it('never drops Supabase public/private/auth/storage/realtime schemas, only prefixed fixtures',()=>{
  for(const q of [setupSQL(),replaySQL(),regrantSQL()]){
   expect(q).not.toMatch(/(?:DROP|CREATE|ALTER)\s+SCHEMA\s+(?!f6u03e_)(?:public|private|auth|storage|realtime)\b/i);
   expect(q).not.toContain('istjjkdcvsvilrycqecd');
  }
  expect(HOSTED_EXECUTION_ENABLED).toBe(false);
  expect(FIXTURE_DB).toBe('f6_u03e_fixture');
 });
 it('restores only USAGE to anon and authenticated, allows CREATE only to service and admin on public',()=>{
  const a=regrantSQL();
  expect(a).toContain('GRANT USAGE ON SCHEMA f6u03e_public TO f6u03e_anon, f6u03e_authenticated');
  expect(a).toContain('GRANT USAGE, CREATE ON SCHEMA f6u03e_public TO f6u03e_service_role, f6u03e_supabase_admin');
  expect(a).not.toMatch(/GRANT\s+(?:ALL|CREATE|USAGE,\s*CREATE)[^;]*TO\s+f6u03e_anon/i);
  expect(a).toContain('GRANT USAGE ON SCHEMA f6u03e_private TO f6u03e_authenticated, f6u03e_service_role');
 });
 it('always checks role privileges after regrant and before COMMIT',()=>{
  const x=replaySQL();
  expect(x.indexOf('DROP SCHEMA f6u03e_private')).toBeGreaterThan(x.indexOf('BEGIN;'));
  expect(x.indexOf('GRANT USAGE ON SCHEMA f6u03e_public')).toBeGreaterThan(x.indexOf('CREATE SCHEMA f6u03e_public'));
  expect(x.indexOf('F6U03E_ACL_NOT_RESTORED')).toBeGreaterThan(x.indexOf('f6u03e_external_auth_trigger'));
  expect(x.indexOf('F6U03E_ACL_NOT_RESTORED')).toBeLessThan(x.lastIndexOf('COMMIT;'));
 });
 it('detects deliberate missing-grant scenario rather than fabricating a success',()=>{
  const x=replaySQL({includeGrants:false});
  expect(x).not.toContain('GRANT USAGE ON SCHEMA f6u03e_public');
  expect(x).toContain('F6U03E_ACL_NOT_RESTORED');
 });
 it('covers four rollback injection phases before COMMIT',()=>{
  expect(FAULTS).toEqual(['AFTER_DROP','AFTER_REGRANT','AFTER_AUTH','BEFORE_COMMIT']);
  for(const fault of FAULTS){
   const q=replaySQL({fault});
   expect(q).toContain('F6U03E_FAULT_'+fault);
   expect(q.indexOf('F6U03E_FAULT_'+fault)).toBeLessThan(q.indexOf('COMMIT;'));
  }
  expect(()=>replaySQL({fault:'UNKNOWN'})).toThrow('F6U03E_UNKNOWN_FAULT');
 });
 it('has fixture-only DDL event observers and an Auth-equivalent external trigger',()=>{
  expect(setupSQL()).toContain('CREATE EVENT TRIGGER f6u03e_ddl_watcher');
  expect(setupSQL()).toContain('CREATE EVENT TRIGGER f6u03e_drop_watcher');
  expect(setupSQL()).toContain('CREATE TRIGGER f6u03e_external_auth_trigger');
  expect(replaySQL()).toContain('CREATE TRIGGER f6u03e_external_auth_trigger');
  expect(statusSQL()).toContain('f6u03e_audit.events');
 });
 it('records the six observed actual Supabase provider function source fingerprints without executing them',()=>{
  expect(Object.keys(SUPABASE_PROVIDER_FUNCTION_MD5)).toHaveLength(6);
  expect(SUPABASE_PROVIDER_FUNCTION_MD5.pgrst_ddl_watch).toMatch(/^[a-f0-9]{32}$/);
  expect(SUPABASE_PROVIDER_FUNCTION_MD5.pgrst_drop_watch).toMatch(/^[a-f0-9]{32}$/);
  expect(SCOPE).toBe('LOCAL_POSTGRES17_ACL_DDL_EVENT_FIXTURE_ONLY');
 });
 it('rejects direct execution mode; tests do not create a cloud connection',()=>{
  const p=spawnSync(process.execPath,['scripts/shoperation-f6-u03e-schema-restore.mjs','--execute'],{encoding:'utf8'});
  expect(p.status).not.toBe(0);
  expect(p.stderr).toContain('F6U03E_NO_HOSTED_DATABASE_EXECUTION');
  expect(()=>runFixture({})).toThrow('F6U03E_NOT_EPHEMERAL');
 });
});
