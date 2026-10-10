import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const canonicalPath='supabase/migrations/20260909203208_digital_office_draft_revision_guard_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const original=read(canonicalPath);
const baseline=read(root+'0061_digital_office_draft_revision_guard_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F14 canonical optimistic Office draft revision',()=>{
 it('copies original complete SQL with SHA256 provenance',()=>{
  expect(baseline).toContain('-- Canonical source: '+canonicalPath+'\n');
  expect(baseline).toContain('-- Canonical SHA256: '+createHash('sha256').update(original).digest('hex')+'\n');
  expect(baseline.slice(baseline.indexOf(marker)+marker.length)).toBe(original);
 });
 it('follows composer, original draft tenant FK and custom reply update guard without rewriting history',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0059_digital_office_drafts_tenant_integrity_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0060_office_reply_job_update_guard_v1.sql');
  expect(files[i+2]).toBe('0061_digital_office_draft_revision_guard_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(62);
  expect(read(root+'0057_digital_office_composer_drafts_foundation_v1.sql')).toContain('create table if not exists public.office_drafts (');
 });
 it('creates strictly positive revision column with nonzero default',()=>{
  expect(original).toContain('add column if not exists revision bigint not null default 1');
  expect(original).toContain('drop constraint if exists office_drafts_revision_positive_check');
  expect(original).toContain('add constraint office_drafts_revision_positive_check check (revision>0)');
 });
 it('rejects missing revision on an existing draft and updates atomically only at expected version',()=>{
  expect(original).toContain('create or replace function public.admin_mutate_office_draft_v2(');
  expect(original).toContain("p_payload->>'expectedRevision'");
  expect(original).toContain('OFFICE_DRAFT_REVISION_REQUIRED');
  expect(original).toContain('revision=revision+1');
  expect(original).toContain('and revision=v_expected_revision');
  expect(original).toContain('and instance_id=p_instance_id');
  expect(original).toContain('and author_user_id=p_actor');
  expect(original).toContain('OFFICE_DRAFT_CONFLICT');
 });
 it('keeps new draft at revision 1 and limits audit to creation or explicit manual saves',()=>{
  expect(original).toContain('values(p_instance_id,p_actor,v_thread_id,v_draft_type,v_to_email,v_subject,v_body,1)');
  expect(original).toContain("v_save_mode not in ('manual','autosave')");
  expect(original).toContain("if v_was_new or v_save_mode='manual' then");
  expect(original).toContain('insert into public.admin_audit_log(');
 });
 it('preserves tenant, customer thread and capability guards in the versioned RPC',()=>{
  expect(original).toContain('public.can_manage_support(p_instance_id,p_actor)');
  expect(original).toContain('where id=v_thread_id and instance_id=p_instance_id and conversation_type');
  expect(original).toContain('public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor)');
  expect(original).toContain('private.office_active_owner_v1(p_instance_id,p_actor)');
  expect(original).toContain('revoke all on function public.admin_mutate_office_draft_v2(');
  expect(original).toContain('grant execute on function public.admin_mutate_office_draft_v2(');
 });
 it('keeps migration source-only and real Fresh Install proof outstanding',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('62 migrations');
  expect(baseline).toContain('No real PostgreSQL concurrent-write');
 });
});
