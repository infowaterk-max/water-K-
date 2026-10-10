import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';

const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260908024000_digital_office_rls_helper_exposure_closure_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const canonical=read(sourcePath);
const baseline=read(root+'0053_digital_office_rls_helper_exposure_closure_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2 F6 — Office RLS current-user helper and service-only RPC',()=>{
 it('keeps exact canonical SQL source with cryptographic provenance',()=>{
  const hash=createHash('sha256').update(canonical).digest('hex');
  expect(baseline).toContain('-- Canonical source: '+sourcePath+'\n');
  expect(baseline).toContain('-- Canonical SHA256: '+hash+'\n');
  expect(baseline.slice(baseline.indexOf(marker)+marker.length)).toBe(canonical);
 });
 it('appends after 0050–0052 privacy chain while preserving historical migrations',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0050_digital_office_privacy_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0051_digital_office_privacy_membership_hardening_v1.sql');
  expect(files[i+2]).toBe('0052_digital_office_private_author_read_sync_v1.sql');
  expect(files[i+3]).toBe('0053_digital_office_rls_helper_exposure_closure_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(54);
 });
 it('binds a browser private helper to the actual current auth.uid()',()=>{
  const start=canonical.indexOf('create or replace function private.current_user_can_read_office_thread_v1(');
  const end=canonical.indexOf('revoke all on function private.current_user_can_read_office_thread_v1(');
  const fn=canonical.slice(start,end);
  expect(fn).toContain('p_instance_id uuid');
  expect(fn).toContain('p_thread_id uuid');
  expect(fn).not.toContain('p_user_id uuid');
  expect(fn).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,auth.uid())');
  expect(canonical).toContain('revoke all on function private.current_user_can_read_office_thread_v1(uuid,uuid) from public,anon');
  expect(canonical).toContain('grant execute on function private.current_user_can_read_office_thread_v1(uuid,uuid) to authenticated');
 });
 it('makes actor-parameterized public SECURITY DEFINER read API service-only',()=>{
  expect(canonical).toContain('revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid) from public,anon,authenticated');
  expect(canonical).toContain('grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to service_role');
  expect(canonical).not.toMatch(/grant execute on function public\.can_read_office_thread_v1\([^)]*\) to (?:anon|authenticated)\b/i);
 });
 it('updates all three Office SELECT RLS policies without reintroducing ALL policies',()=>{
  for(const table of ['office_threads','office_messages','office_tasks']){
    expect(canonical).toContain('drop policy if exists '+table+'_store_all on public.'+table);
    expect(canonical).toContain('create policy '+table+'_store_all on public.'+table);
  }
  expect((canonical.match(/for select to authenticated/g)??[]).length).toBe(3);
  expect((canonical.match(/private\.current_user_can_read_office_thread_v1\(instance_id,/g)??[]).length).toBe(3);
  expect(canonical).toContain('thread_id is null and public.can_manage_support(instance_id,(select auth.uid()))');
  expect(canonical).not.toMatch(/create policy office_\w+_store_all on public\.\w+\s+for all/i);
 });
 it('leaves actual Fresh Install and Pro tenant security explicitly unproven',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('54 migrations');
  expect(manifest.notes).toContain('U10A1 strict Pro');
  const old=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
  for(const code of ['officeCommunication','support','teamChat'])expect(old).toContain("capability_code = '"+code+"'");
 });
});
