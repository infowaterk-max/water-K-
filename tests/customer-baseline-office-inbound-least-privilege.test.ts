import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const sourceFile='supabase/migrations/20260908031000_digital_office_real_inbound_least_privilege_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourceFile);
const target=read(root+'0056_digital_office_real_inbound_least_privilege_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2 F9 canonical Office inbound least-privilege',()=>{
 it('preserves byte-identical canonical SQL and authenticated source SHA-256',()=>{
  const hash=createHash('sha256').update(source).digest('hex');
  expect(target).toContain('-- Canonical source: '+sourceFile+'\n');
  expect(target).toContain('-- Canonical SHA256: '+hash+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('orders F9 after F7 inbound and F8 normalization, with future append-only compatibility',()=>{
  const files=readdirSync(root).filter(f=>f.endsWith('.sql')).sort();
  const i=files.indexOf('0054_digital_office_real_inbound_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0055_digital_office_mailbox_normalization_v1.sql');
  expect(files[i+2]).toBe('0056_digital_office_real_inbound_least_privilege_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(57);
 });
 it('revokes all service_role table privileges before regranting only CRUD on both secret tables',()=>{
  for(const table of ['office_mailboxes','office_thread_email_routes']){
   const revoke='revoke all on table public.'+table+' from service_role;';
   const grant='grant select,insert,update,delete on table public.'+table+' to service_role;';
   expect(source).toContain(revoke);
   expect(source).toContain(grant);
   expect(source.indexOf(revoke)).toBeLessThan(source.indexOf(grant));
   expect(source).not.toContain('grant all on table public.'+table);
  }
  expect(source).not.toMatch(/grant .* on table public\.(?:office_mailboxes|office_thread_email_routes) to (?:anon|authenticated|public)\b/i);
 });
 it('retains tenant/thread composite routing index with the exact FK column order',()=>{
  expect(source).toContain('create index if not exists office_thread_email_routes_thread_instance_idx');
  expect(source).toContain('on public.office_thread_email_routes(thread_id,instance_id)');
  const f7=read(root+'0054_digital_office_real_inbound_foundation_v1.sql');
  expect(f7).toContain('foreign key(thread_id,instance_id) references public.office_threads(id,instance_id)');
  expect(f7).toContain('reply_token uuid not null default gen_random_uuid()');
 });
 it('does not weaken earlier Office mailbox/reply token browser RLS or grants',()=>{
  const f7=read(root+'0054_digital_office_real_inbound_foundation_v1.sql');
  for(const table of ['office_mailboxes','office_thread_email_routes']){
   expect(f7).toContain('alter table public.'+table+' enable row level security');
   expect(f7).toContain('revoke all on table public.'+table+' from public,anon,authenticated');
  }
 });
 it('keeps the new 57-migration baseline unproved and all advanced dependencies visible',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('57 migrations');
  expect(manifest.notes).toContain('Advanced Pro SQL still BLOCKED');
  const earlier=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
  for(const code of ['officeCommunication','support','teamChat'])expect(earlier).toContain("capability_code = '"+code+"'");
 });
});

