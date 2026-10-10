import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260908034500_digital_office_reply_queue_guard_v1.sql';
const read=(f:string)=>readFileSync(f,'utf8');
const source=read(sourcePath);
const target=read(root+'0058_digital_office_reply_queue_guard_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F11 Office reply queue canonical INSERT boundary',()=>{
 it('copies original complete canonical SQL body with SHA256 identity',()=>{
  const hash=createHash('sha256').update(source).digest('hex');
  expect(target).toContain('-- Canonical source: '+sourcePath+'\n');
  expect(target).toContain('-- Canonical SHA256: '+hash+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('places 0058 immediately after composer/drafts 0057 with future append-only compatibility',()=>{
  const names=readdirSync(root).filter(f=>f.endsWith('.sql')).sort();
  const i=names.indexOf('0057_digital_office_composer_drafts_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(names[i+1]).toBe('0058_digital_office_reply_queue_guard_v1.sql');
  expect(names.length).toBeGreaterThanOrEqual(59);
  expect(read(root+'0054_digital_office_real_inbound_foundation_v1.sql')).toContain('office_thread_email_routes');
 });
 it('preserves fail-closed customer-only tenant/thread UUID lookup and explicit exception',()=>{
  expect(source).toContain("if new.template_key<>'support_reply'");
  expect(source).toContain("coalesce(new.payload,'{}'::jsonb) ? 'officeThreadId'");
  expect(source).toContain("(new.payload->>'officeThreadId')::uuid");
  expect(source).toContain("where id=v_thread_id and instance_id=new.instance_id and conversation_type='customer'");
  expect(source).toContain('OFFICE_REPLY_THREAD_REQUIRED');
 });
 it('checks active tenant-bound mailbox and private reply route before INSERT',()=>{
  expect(source).toContain('if v_thread.mailbox_key is null');
  expect(source).toContain('OFFICE_MAILBOX_NOT_CONFIGURED');
  expect(source).toContain('m.instance_id=new.instance_id');
  expect(source).toContain('m.mailbox_key=v_thread.mailbox_key');
  expect(source).toContain('m.is_active=true');
  expect(source).toContain('r.instance_id=new.instance_id and r.thread_id=v_thread_id');
  expect(source).toContain('OFFICE_EMAIL_ROUTE_MISSING');
 });
 it('keeps the canonical SECURITY DEFINER trigger private, while recording UPDATE bypass as OPEN',()=>{
  expect(source).toContain('create or replace function private.enforce_office_reply_queue_mailbox_v1()');
  expect(source).toContain('revoke all on function private.enforce_office_reply_queue_mailbox_v1() from public,anon,authenticated');
  expect(source).toContain('drop trigger if exists communication_jobs_office_reply_mailbox_guard on public.communication_jobs');
  expect(source).toContain('create trigger communication_jobs_office_reply_mailbox_guard');
  expect(source).toContain('before insert on public.communication_jobs');
  expect(source).not.toMatch(/before insert or update\b/i);
  const plan=JSON.parse(read('quality/development/active-plan.json'));
  expect(plan.notes).toContain('F11 canonical trigger is INSERT-only');
  expect(plan.operationalIntelligence.unresolvedRisks.join(' ')).toContain('Forward-only update-path guard');
 });
 it('keeps 59-migration baseline unproved, without claiming target email delivery',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('59-migration');
  expect(target).toContain('No actual queued email');
 });
});

