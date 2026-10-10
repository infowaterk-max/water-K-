import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';

const root='supabase/customer-baseline/migrations/';
const sourceFile='supabase/migrations/20260907205500_team_permissions_scoped_delegation_v2.sql';
const baselineFile=root+'0048_team_permissions_scoped_delegation_v2.sql';
const read=(f:string)=>readFileSync(f,'utf8');
const body=read(sourceFile);
const migration=read(baselineFile);
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const boundary='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2-F2 scoped delegation customer baseline',()=>{
 it('preserves 20260907205500 canonical source SQL exactly with SHA-256',()=>{
  const sha=createHash('sha256').update(body).digest('hex');
  expect(migration).toContain('-- Canonical source: '+sourceFile+'\n');
  expect(migration).toContain('-- Canonical SHA256: '+sha+'\n');
  expect(migration.slice(migration.indexOf(boundary)+boundary.length)).toBe(body);
 });
 it('follows 0047 foundation and does not change historical migration order',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  expect(files.length).toBeGreaterThanOrEqual(49);
  const prior=files.indexOf('0046_alap_team_chat_plan_grant_reconcile.sql');
  expect(prior).toBeGreaterThanOrEqual(0);
  expect(files[prior+1]).toBe('0047_team_permissions_foundation_v1.sql');
  expect(files[prior+2]).toBe('0048_team_permissions_scoped_delegation_v2.sql');
  const f1=read(root+'0047_team_permissions_foundation_v1.sql');
  for(const name of ['store_delegations','store_permission_catalog','store_permission_overrides']){
    expect(f1).toContain('create table if not exists public.'+name);
  }
  expect(f1).toContain('create or replace function public.evaluate_store_capability_v1(');
 });
 it('preserves tenant-scoped delegation v2 canonical schema and privileges',()=>{
  expect(body).toContain('alter table public.store_delegations');
  expect(body).toContain('create or replace function private.store_source_can_delegate_capability_v2(');
  expect(body).toContain('create or replace function public.evaluate_store_capability_v1(');
  expect(body).toContain('create or replace function public.merchant_create_store_delegation_v2(');
  expect(body).toContain('revoke all on function public.merchant_create_store_delegation_v2(');
  expect(body).toContain('grant execute on function public.merchant_create_store_delegation_v2(');
  expect(body).toContain('to service_role');
 });
 it('manifest remains not approved for new Fresh Install, despite source guard success',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('canonical 0048 scoped team permission delegation v2');
  expect(migration).toContain('modern Office privacy 0049+ remains BLOCKED');
 });
 it('preserves independent Alap support and Team Chat plan grant authority',()=>{
  const existing=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
  expect(existing).toContain("capability_code = 'officeCommunication'");
  expect(existing).toContain("capability_code = 'support'");
  expect(existing).toContain("capability_code = 'teamChat'");
 });
});
