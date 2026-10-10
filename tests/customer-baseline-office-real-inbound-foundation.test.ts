import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';

const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260908030000_digital_office_real_inbound_foundation_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourcePath);
const baseline=read(root+'0054_digital_office_real_inbound_foundation_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2 F7 canonical real inbound Office mailbox/routing baseline',()=>{
 it('preserves entire production source SQL and its SHA256',()=>{
  const hash=createHash('sha256').update(source).digest('hex');
  expect(baseline).toContain('-- Canonical source: '+sourcePath+'\n');
  expect(baseline).toContain('-- Canonical SHA256: '+hash+'\n');
  expect(baseline.slice(baseline.indexOf(marker)+marker.length)).toBe(source);
 });
 it('follows reviewed Office privacy 0050–0053 while allowing later append-only migrations',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const idx=files.indexOf('0053_digital_office_rls_helper_exposure_closure_v1.sql');
  expect(idx).toBeGreaterThan(0);
  expect(files[idx+1]).toBe('0053_inbound_office_email_atomic_v2.sql');
  expect(files[idx+2]).toBe('0054_digital_office_real_inbound_foundation_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(55);
  expect(read(root+'0050_digital_office_privacy_foundation_v1.sql')).toContain('office_threads_id_instance_unique');
 });
 it('isolates mailbox secrets and reply tokens from browser reads and grants',()=>{
  for(const table of ['office_mailboxes','office_thread_email_routes']){
   expect(source).toContain('create table if not exists public.'+table+' (');
   expect(source).toContain('alter table public.'+table+' enable row level security');
   expect(source).toContain('revoke all on table public.'+table+' from public,anon,authenticated');
   expect(source).toContain('grant select,insert,update,delete on table public.'+table+' to service_role');
  }
  expect(source).toContain('reply_token uuid not null default gen_random_uuid()');
  expect(source).toContain('on public.office_thread_email_routes(instance_id,reply_token)');
  expect(source).toContain('foreign key(thread_id,instance_id) references public.office_threads(id,instance_id)');
  const beforeRoutes=source.split('create table if not exists public.office_thread_email_routes')[0];
  expect(beforeRoutes).not.toContain('reply_token uuid');
 });
 it('creates customer-only route sync and RFC-aware inbound data ingestion',()=>{
  expect(source).toContain("where t.conversation_type='customer'");
  expect(source).toContain("if new.conversation_type='customer'");
  expect(source).toContain('create trigger office_threads_email_route_sync');
  expect(source).toContain('create or replace function public.record_inbound_office_email_v3(');
  expect(source).toContain('pg_advisory_xact_lock');
  expect(source).toContain('INBOUND_MAILBOX_NOT_FOUND');
  expect(source).toContain('INBOUND_ATTACHMENT_COUNT_INVALID');
  expect(source).toContain('office_messages_instance_rfc_message_idx');
 });
 it('preserves browser revokes and service-only versioned inbound RPC authority',()=>{
  expect(source).toContain('revoke all on function public.record_inbound_office_email_v3(');
  expect(source).toContain('grant execute on function public.record_inbound_office_email_v3(');
  expect(source).toContain('to service_role');
  expect(source).toContain('revoke all on function public.record_inbound_office_email_v2(');
 });
 it('leaves Fresh Install provider delivery, role/tenant and Pro Office acceptance blocked',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('55-migration');
  expect(baseline).toContain('NOT real Fresh Install');
  expect(baseline).toContain('0055+');
  const split=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
  for(const name of ['support','officeCommunication','teamChat'])expect(split).toContain("capability_code = '"+name+"'");
 });
});

