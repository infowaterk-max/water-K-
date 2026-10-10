import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const read=(f:string)=>readFileSync(f,'utf8');
const sql=read(root+'0060_office_reply_job_update_guard_v1.sql');
const previous=read(root+'0058_digital_office_reply_queue_guard_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
describe('Core #1186 U10A2 F13 SQL source hardening of Office reply UPDATE path',()=>{
 it('appends a forward-only migration after the immutable canonical 0059',()=>{
  const files=readdirSync(root).filter(f=>f.endsWith('.sql')).sort();
  const i=files.indexOf('0058_digital_office_reply_queue_guard_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0059_digital_office_drafts_tenant_integrity_v1.sql');
  expect(files[i+2]).toBe('0060_office_reply_job_update_guard_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(61);
  expect(previous).toContain('-- Canonical source: supabase/migrations/20260908034500_digital_office_reply_queue_guard_v1.sql');
 });
 it('replaces exactly the old queue trigger with a BEFORE INSERT OR UPDATE trigger',()=>{
  expect(previous).toContain('before insert on public.communication_jobs');
  expect(previous).not.toContain('before insert or update on public.communication_jobs');
  expect(sql).toContain('drop trigger if exists communication_jobs_office_reply_mailbox_guard on public.communication_jobs');
  expect(sql).toContain('create trigger communication_jobs_office_reply_mailbox_guard');
  expect(sql).toContain('before insert or update on public.communication_jobs');
  expect(sql).toContain('for each row execute function private.enforce_office_reply_queue_mailbox_v1()');
 });
 it('rejects removal of Office tag or switch to another email template after initial queue',()=>{
  expect(sql).toContain("old.template_key='support_reply'");
  expect(sql).toContain("coalesce(old.payload,'{}'::jsonb) ? 'officeThreadId'");
  expect(sql).toContain('new.template_key is distinct from old.template_key');
  expect(sql).toContain("not (coalesce(new.payload,'{}'::jsonb) ? 'officeThreadId')");
  expect(sql).toContain('OFFICE_REPLY_ROUTING_CONTEXT_IMMUTABLE');
 });
 it('rejects altering original tenant or Office thread after initial queue',()=>{
  expect(sql).toContain('new.instance_id is distinct from old.instance_id');
  expect(sql).toContain("(new.payload->>'officeThreadId') is distinct from (old.payload->>'officeThreadId')");
  expect(sql).toContain('return new;');
 });
 it('installs a separate BEFORE UPDATE context immutability trigger before the queue validator',()=>{
  expect(sql).toContain('create trigger communication_jobs_office_reply_context_immutable');
  expect(sql).toContain('before update on public.communication_jobs');
  expect(sql).toContain('for each row execute function private.enforce_office_reply_job_context_immutable_v1()');
  expect('communication_jobs_office_reply_context_immutable' < 'communication_jobs_office_reply_mailbox_guard').toBe(true);
 });
 it('uses least-privileged private invoker validator without a browser EXECUTE grant',()=>{
  expect(sql).toContain('create or replace function private.enforce_office_reply_job_context_immutable_v1()');
  expect(sql).toContain('security invoker');
  expect(sql).toContain("set search_path=''");
  expect(sql).toContain('revoke all on function private.enforce_office_reply_job_context_immutable_v1()');
  expect(sql).toContain('from public,anon,authenticated');
  expect(sql).not.toMatch(/grant execute on function private\.enforce_office_reply_job_context_immutable_v1\(/i);
 });
 it('reuses the canonical validator that still checks active mailbox, customer thread and secret route',()=>{
  expect(previous).toContain("where id=v_thread_id and instance_id=new.instance_id and conversation_type='customer'");
  expect(previous).toContain('m.is_active=true');
  expect(previous).toContain('OFFICE_MAILBOX_NOT_CONFIGURED');
  expect(previous).toContain('OFFICE_EMAIL_ROUTE_MISSING');
  expect(sql).not.toContain('create or replace function private.enforce_office_reply_queue_mailbox_v1()');
 });
 it('explicitly preserves outstanding real database proof and downstream closure',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('61 migrations');
  expect(manifest.notes).toContain('actual PostgreSQL trigger');
  expect(sql).toContain('disposable PostgreSQL trigger/role/legacy-row proof');
  expect(sql).not.toMatch(/\bgrant\s+(?:select|insert|update|delete|all)\s+on\s+table\s+public\.communication_jobs\b/i);
 });
});
