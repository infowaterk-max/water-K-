import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const sourceFile='supabase/migrations/20260908030500_digital_office_mailbox_normalization_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourceFile);
const target=read(root+'0055_digital_office_mailbox_normalization_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F8 canonical mailbox normalization',()=>{
 it('preserves exact original SQL with SHA256',()=>{
  const hash=createHash('sha256').update(source).digest('hex');
  expect(target).toContain('-- Canonical source: '+sourceFile+'\n');
  expect(target).toContain('-- Canonical SHA256: '+hash+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('follows 0054 mailbox foundation while allowing later append-only migrations',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const index=files.indexOf('0054_digital_office_real_inbound_foundation_v1.sql');
  expect(index).toBeGreaterThan(0);
  expect(files[index+1]).toBe('0055_digital_office_mailbox_normalization_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(56);
  const prior=read(root+'0054_digital_office_real_inbound_foundation_v1.sql');
  expect(prior).toContain('create table if not exists public.office_mailboxes (');
  expect(prior).toContain('revoke all on table public.office_thread_email_routes from public,anon,authenticated');
 });
 it('adds both normalized mailbox key and inbound address database constraints',()=>{
  expect(source).toContain('alter table public.office_mailboxes');
  for(const name of ['office_mailboxes_inbound_address_normalized_check','office_mailboxes_mailbox_key_normalized_check']){
    expect(source).toContain('drop constraint if exists '+name);
    expect(source).toContain('add constraint '+name);
  }
  expect(source).toContain('check (inbound_address=lower(trim(inbound_address)))');
  expect(source).toContain('check (mailbox_key=lower(trim(mailbox_key)))');
 });
 it('preserves service-only reply token storage from 0054',()=>{
  const prior=read(root+'0054_digital_office_real_inbound_foundation_v1.sql');
  expect(prior).toContain('reply_token uuid not null default gen_random_uuid()');
  expect(prior).toContain('alter table public.office_thread_email_routes enable row level security');
  expect(prior).toContain('revoke all on table public.office_mailboxes from public,anon,authenticated');
 });
 it('does not assert occupied staging compatibility or fake Fresh Install proof',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('56 migration customer baseline snapshot-reviewed');
  expect(target).toContain('Existing invalid rows on occupied databases require preflight');
  expect(target).toContain('0056 least privilege');
 });
});
