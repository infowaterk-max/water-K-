import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260909203604_digital_office_recipient_envelope_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourcePath);
const target=read(root+'0063_digital_office_recipient_envelope_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F16 canonical Office recipient envelope and attachment metadata',()=>{
 it('preserves complete original SQL body with SHA256 provenance',()=>{
  expect(target).toContain('-- Canonical source: '+sourcePath+'\n');
  expect(target).toContain('-- Canonical SHA256: '+createHash('sha256').update(source).digest('hex')+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('appends 0063 after canonical draft revision and reply singleton, preserving older source',()=>{
  const names=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=names.indexOf('0061_digital_office_draft_revision_guard_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(names[i+1]).toBe('0062_digital_office_reply_draft_singleton_v1.sql');
  expect(names[i+2]).toBe('0063_digital_office_recipient_envelope_v1.sql');
  expect(names.length).toBeGreaterThanOrEqual(64);
  expect(read(root+'0057_digital_office_composer_drafts_foundation_v1.sql')).toContain('create table if not exists public.office_drafts (');
 });
 it('adds Cc and Bcc recipient arrays to both draft and sent message, bounded to 10',()=>{
  for(const table of ['office_drafts','office_messages']){
   expect(source).toContain('alter table public.'+table);
   for(const prefix of ['cc','bcc']){
    expect(source).toContain('add column if not exists '+prefix+'_emails text[] not null default');
    expect(source).toContain('add constraint '+table+'_'+prefix+'_count_check check (cardinality('+prefix+'_emails)<=10)');
   }
  }
 });
 it('normalizes recipient arrays, rejects invalid/excess and hides helpers from browsers',()=>{
  expect(source).toContain('create or replace function private.office_jsonb_text_array_v1(');
  expect(source).toContain('create or replace function private.normalize_office_email_list_v1(');
  expect(source).toContain('OFFICE_EMAIL_LIST_INVALID');
  expect(source).toContain('OFFICE_EMAIL_LIST_TOO_LARGE');
  expect(source).toContain('revoke all on function private.office_jsonb_text_array_v1(jsonb) from public,anon,authenticated');
  expect(source).toContain('revoke all on function private.normalize_office_email_list_v1(text[],text[],integer) from public,anon,authenticated');
 });
 it('isolates attachment metadata under RLS with exactly one owner and same-tenant FK',()=>{
  expect(source).toContain('create table if not exists public.office_attachments (');
  expect(source).toContain('foreign key(draft_id,instance_id) references public.office_drafts(id,instance_id)');
  expect(source).toContain('foreign key(message_id,instance_id) references public.office_messages(id,instance_id)');
  expect(source).toContain('check ((draft_id is not null)::int + (message_id is not null)::int = 1)');
  expect(source).toContain('check (size_bytes between 1 and 26214400)');
  expect(source).toContain('alter table public.office_attachments enable row level security');
  expect(source).toContain('revoke all on table public.office_attachments from public,anon,authenticated');
  expect(source).toContain('grant select,insert,update,delete on table public.office_attachments to service_role');
 });
 it('keeps versioned draft and queue server APIs privileged and revision-aware',()=>{
  expect(source).toContain('create or replace function public.admin_mutate_office_draft_v3(');
  expect(source).toContain('create or replace function public.admin_queue_office_email_v4(');
  expect(source).toContain("p_payload->>'expectedRevision'");
  expect(source).toContain('OFFICE_DRAFT_CONFLICT');
  for(const [fn,types] of [['admin_mutate_office_draft_v3','uuid,uuid,text,jsonb'],['admin_queue_office_email_v4','uuid,uuid,jsonb']]){
   expect(source).toContain('revoke all on function public.'+fn+'('+types+') from public,anon,authenticated');
   expect(source).toContain('grant execute on function public.'+fn+'('+types+') to service_role');
  }
 });
 it('does not claim provider, Storage access or live DB role/tenant closure',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('64 reviewed migrations');
  expect(target).toContain('no real Postgres tenant/RLS/actor');
 });
});
