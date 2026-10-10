import {describe,expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='supabase/customer-baseline/migrations/';
const src='supabase/migrations/20260909204503_digital_office_team_chat_2_foundation_v1.sql';
const read=(f:string)=>readFileSync(f,'utf8');
const original=read(src),copied=read(dir+'0065_digital_office_team_chat_2_foundation_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F20 canonical Office Team Chat 2 Foundation',()=>{
 it('preserves exact complete source with SHA256 provenance',()=>{
  expect(copied).toContain('-- Canonical source: '+src+'\n');
  expect(copied).toContain('-- Canonical SHA256: '+createHash('sha256').update(original).digest('hex')+'\n');
  expect(copied.slice(copied.indexOf(marker)+marker.length)).toBe(original);
 });
 it('appends 0065 after 0064 attachment integrity, preserving all legacy SQL',()=>{
  const files=readdirSync(dir).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0064_digital_office_attachment_metadata_integrity_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0065_digital_office_team_chat_2_foundation_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(67);
 });
 it('creates at most one active owner per conversation thread and constrains participant role',()=>{
  expect(original).toContain("check (participant_role in ('owner','member'))");
  expect(original).toContain('create unique index if not exists office_thread_participants_active_owner_uidx');
  expect(original).toContain('on public.office_thread_participants(instance_id,thread_id)');
  expect(original).toContain("where left_at is null and participant_role='owner'");
 });
 it('adds tenant-and-message scoped mentions with referenced auth users',()=>{
  expect(original).toContain('create table if not exists public.office_message_mentions (');
  expect(original).toContain('mentioned_user_id uuid not null references auth.users(id)');
  expect(original).toContain('mentioned_by uuid not null references auth.users(id)');
  expect(original).toContain('references public.office_messages(id,thread_id,instance_id) on delete cascade');
  expect(original).toContain('office_message_mentions_user_unseen_idx');
 });
 it('adds tenant-scoped business object link cards guarded by private existence helper',()=>{
  expect(original).toContain('create table if not exists public.office_message_object_links (');
  expect(original).toContain('foreign key(message_id,thread_id,instance_id)');
  expect(original).toContain('private.office_chat_object_exists_v1(');
  for(const entity of ['orders','commercial_offers','return_cases','support_tickets','office_tasks']){
   expect(original).toContain('from public.'+entity);
  }
  expect(original).toContain('OFFICE_OBJECT_LINK_NOT_FOUND');
 });
 it('applies RLS and revokes browser direct access to mentions and object link tables',()=>{
  for(const name of ['office_message_mentions','office_message_object_links']){
   expect(original).toContain('alter table public.'+name+' enable row level security');
   expect(original).toContain('revoke all on table public.'+name+' from public,anon,authenticated');
   expect(original).toContain('grant select,insert,update,delete on table public.'+name+' to service_role');
  }
 });
 it('guards chat owner action with versioned service-only administrative RPC',()=>{
  expect(original).toContain('create or replace function private.office_active_thread_owner_v1(');
  expect(original).toContain('create or replace function public.admin_mutate_office_team_chat_v2(');
  expect(original).toContain("p_action text");
  expect(original).toContain("p_instance_id uuid");
  expect(original).toContain('private.office_active_thread_owner_v1');
  expect(original).toMatch(/revoke all on function public\.admin_mutate_office_team_chat_v2\([^;]*?\)\s+from public,anon,authenticated;/is);
  expect(original).toMatch(/grant execute on function public\.admin_mutate_office_team_chat_v2\([^;]*?\)\s+to service_role;/is);
 });
 it('retains snapshot-reviewed with independent real runtime and native Supabase proof required',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('Baseline 67 SQL migrations');
  expect(copied).toContain('Communication Hub dependency closure remain BLOCKED');
 });
});
