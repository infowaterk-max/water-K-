import{describe,it,expect}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';
const root='supabase/customer-baseline/migrations/';
const sourceFile='supabase/migrations/20260908034000_digital_office_composer_drafts_foundation_v1.sql';
const read=(s:string)=>readFileSync(s,'utf8');
const source=read(sourceFile);
const target=read(root+'0057_digital_office_composer_drafts_foundation_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F10 Office Composer/Drafts foundation source',()=>{
 it('is complete canonical SQL with SHA256 provenance',()=>{
  expect(target).toContain('-- Canonical source: '+sourceFile+'\n');
  expect(target).toContain('-- Canonical SHA256: '+createHash('sha256').update(source).digest('hex')+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('is ordered after 0054-0056 inbound prerequisites and leaves earlier sources intact',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0054_digital_office_real_inbound_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0055_digital_office_mailbox_normalization_v1.sql');
  expect(files[i+2]).toBe('0056_digital_office_real_inbound_least_privilege_v1.sql');
  expect(files[i+3]).toBe('0057_digital_office_composer_drafts_foundation_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(58);
 });
 it('adds opt-in office.email.compose without changing default role permission presets',()=>{
  expect(source).toContain('insert into public.store_permission_catalog(');
  expect(source).toContain("'office.email.compose'");
  expect(source).toContain('Intentionally NO write to store_role_permission_presets here');
  expect(source).not.toMatch(/insert\s+into\s+public\.store_role_permission_presets\b/i);
  expect(source).toContain('private.office_active_owner_v1');
 });
 it('protects author-private Office draft data behind RLS and service-only grants',()=>{
  expect(source).toContain('create table if not exists public.office_drafts (');
  expect(source).toContain('author_user_id uuid not null references auth.users(id)');
  expect(source).toContain('foreign key(thread_id,instance_id) references public.office_threads(id,instance_id)');
  expect(source).toContain("draft_type in ('new_email','reply')");
  expect(source).toContain('alter table public.office_drafts enable row level security');
  expect(source).toContain('revoke all on table public.office_drafts from public,anon,authenticated');
  expect(source).toContain('grant select,insert,update,delete on table public.office_drafts to service_role');
 });
 it('preserves guarded service-only draft and queued email APIs',()=>{
  for(const n of ['admin_mutate_office_draft_v1','admin_queue_office_email_v3']){
   expect(source).toContain('create or replace function public.'+n+'(');
   expect(source).toContain('revoke all on function public.'+n+'(');
   expect(source).toContain('grant execute on function public.'+n+'(');
  }
  expect(source).toContain('OFFICE_DRAFT_THREAD_ACCESS_DENIED');
  expect(source).toContain('OFFICE_DRAFT_IDENTITY_REQUIRED');
  expect(source).toContain('OFFICE_EMAIL_COMPOSE_PERMISSION_REQUIRED');
  expect(source).toContain('office_mailboxes');
 });
 it('stays in source-only snapshot review pending actual provider and DB proof',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('58 migrations snapshot-reviewed');
  expect(target).toContain('0058+ reply guard');
 });
});

