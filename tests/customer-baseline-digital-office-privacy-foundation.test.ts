import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';

const root='supabase/customer-baseline/migrations/';
const sourceFile='supabase/migrations/20260908022500_digital_office_privacy_foundation_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const original=read(sourceFile);
const migration=read(root+'0050_digital_office_privacy_foundation_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2-F3: canonical participant-aware Office privacy baseline',()=>{
 it('copies complete production privacy foundation including privileges without semantic drift',()=>{
  const hash=createHash('sha256').update(original).digest('hex');
  expect(migration).toContain('-- Canonical source: '+sourceFile+'\n');
  expect(migration).toContain('-- Canonical SHA256: '+hash+'\n');
  expect(migration.slice(migration.indexOf(marker)+marker.length)).toBe(original);
 });
 it('is ordered after scoped Team Permissions v2 and legacy v1 revoke, not in place of them',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0047_team_permissions_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0048_team_permissions_scoped_delegation_v2.sql');
  expect(files[i+2]).toBe('0049_team_permissions_disable_legacy_delegation_creator.sql');
  expect(files[i+3]).toBe('0050_digital_office_privacy_foundation_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(51);
  expect(read(root+'0047_team_permissions_foundation_v1.sql')).toContain('create or replace function public.evaluate_store_capability_v1(');
 });
 it('keeps tenant-bound participants and row level security on membership table',()=>{
  expect(original).toContain('create table if not exists public.office_thread_participants (');
  expect(original).toContain('foreign key(thread_id,instance_id) references public.office_threads(id,instance_id)');
  expect(original).toContain('alter table public.office_thread_participants enable row level security');
  expect(original).toContain('revoke all on table public.office_thread_participants from anon,authenticated');
  expect(original).toContain('private.office_active_participant_v1');
 });
 it('preserves independent customer support and private Team Chat participant read paths',()=>{
  const start=original.indexOf('create or replace function public.can_read_office_thread_v1(');
  const end=original.indexOf('create or replace function public.office_accessible_thread_ids_v1(');
  const readHelper=original.slice(start,end);
  expect(readHelper).toContain("v_thread.conversation_type='customer'");
  expect(readHelper).toContain('return public.can_manage_support(p_instance_id,p_user_id)');
  expect(readHelper).toContain('private.office_active_participant_v1(p_instance_id,p_thread_id,p_user_id)');
  expect(readHelper).toContain("'office.internal_chat'");
  expect(readHelper.indexOf('private.office_active_participant_v1')).toBeLessThan(readHelper.indexOf('public.evaluate_store_capability_v1'));
  expect(readHelper).toContain('where id=p_thread_id and instance_id=p_instance_id');
 });
 it('replaces the three broad store ALL policies with participant-aware SELECT',()=>{
  for(const name of ['office_threads','office_messages','office_tasks']){
   expect(original).toContain('drop policy if exists '+name+'_store_all on public.'+name);
   expect(original).toContain('create policy '+name+'_store_all on public.'+name);
  }
  expect((original.match(/for select to authenticated/g)??[]).length).toBeGreaterThanOrEqual(3);
  expect(original).toContain('revoke all on table public.office_threads from anon');
 });
 it('does not falsely claim complete Pro-only DB closure or Fresh Install proof',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('51-file baseline');
  expect(manifest.notes).toContain('0051+');
  expect(migration).toContain('NOT final Pro-only DB/RLS closure');
  const old=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
  expect(old).toContain("capability_code = 'teamChat'");
  expect(old).toContain("capability_code = 'support'");
  expect(old).toContain("capability_code = 'officeCommunication'");
 });
});
