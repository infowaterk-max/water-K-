import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const runner='scripts/shoperation-customer-baseline-postgres-rehearsal.mjs';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(runner);
const shim=read('tests/fixtures/customer-baseline-postgres-shim.sql');
const negative=read('tests/fixtures/customer-baseline-office-reply-negative.sql');
describe('Core #1186 F19 isolated real PostgreSQL Fresh Install rehearsal contract',()=>{
 it('requires an explicitly local binary directory and refuses remote host/credential options',()=>{
  expect(source).toContain("argv[0].startsWith('--pg-bin-dir=')");
  expect(source).toContain('if(!isAbsolute(binDir))');
  expect(source).not.toContain('process.env.PGHOST');
  expect(source).not.toContain('process.env.DATABASE_URL');
  expect(source).toContain("PGHOST:socket");
  expect(source).toContain("PGSSLMODE:'disable'");
 });
 it('fails closed when local PostgreSQL server binaries are unavailable',()=>{
  const p=spawnSync(process.execPath,[runner,'--pg-bin-dir=/definitely/absent/pg/bin'],{encoding:'utf8',timeout:6000});
  expect(p.status).not.toBe(0);
  expect(p.stderr).toContain('POSTGRES_BINARY_MISSING');
 });
 it('never accepts arbitrary connection arguments or existing DB targets',()=>{
  const p=spawnSync(process.execPath,[runner,'--host=production.invalid'],{encoding:'utf8',timeout:6000});
  expect(p.status).not.toBe(0);
  expect(p.stderr).toContain('Only a local PostgreSQL');
  expect(source).toContain("const database='shoperation_customer_rehearsal'");
  expect(source).toContain("listen_addresses = ''");
  expect(source).toContain('unix_socket_permissions = 0700');
 });
 it('runs official preflight, ALL sorted migrations and official postflight under one fresh target',()=>{
  expect(source).toContain("filter(n=>n.endsWith('.sql')).sort()");
  expect(source).toContain("file('supabase/customer-baseline/target-preflight.sql'");
  expect(source).toContain("file(join(manifest.baselineMigrationDirectory,name)");
  expect(source).toContain("file(manifest.authBootstrapFile");
  expect(source).toContain("file(manifest.seedFile");
  expect(source).toContain("file('supabase/customer-baseline/target-postflight.sql'");
  expect(source).toContain('ON_ERROR_STOP=1');
  expect(source).toContain("REAL_POSTGRES_MIGRATION_");
 });
 it('proves privilege/RLS/trigger behavior, then cleans up even on errors',()=>{
  expect(source).toContain('has_function_privilege');
  expect(source).toContain("const serviceResult=query('SET ROLE service_role;");
  expect(source).toContain('communication_jobs_office_reply_mailbox_guard');
  expect(source).toContain('relrowsecurity');
  expect(source).toContain('permission denied');
  expect(source).toContain("file('tests/fixtures/customer-baseline-office-reply-negative.sql'");
  expect(source).toContain("finally{");
  expect(source).toContain("'-m','immediate','-w','stop'");
  expect(source).toContain('rmSync(dir,{recursive:true,force:true})');
 });
 it('keeps test-only Supabase fixture separated from real provider/AAL2/Pro acceptance',()=>{
  expect(shim).toContain('TEST ONLY: minimal Supabase Auth/Storage compatibility fixture');
  expect(shim).toContain('CREATE SCHEMA auth');
  expect(shim).toContain('CREATE TABLE storage.buckets');
  expect(shim).toContain('CREATE FUNCTION auth.uid()');
  expect(negative).toContain('-- All writes are within one transaction and always rolled back.');
  expect(negative).toContain('OFFICE_REPLY_ROUTING_CONTEXT_IMMUTABLE');
  expect(negative).toContain('ROLLBACK;');
  expect(source).toContain('NOT_PROVEN: native Supabase Auth/Storage');
 }); 
});
