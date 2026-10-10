import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';
const root='supabase/customer-baseline/migrations/';
const src='supabase/migrations/20260909203242_digital_office_reply_draft_singleton_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const original=read(src);
const baseline=read(root+'0062_digital_office_reply_draft_singleton_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F15 canonical reply draft singleton SQL',()=>{
 it('includes entire original canonical SQL unchanged and cryptographic SHA256',()=>{
  expect(baseline).toContain('-- Canonical source: '+src+'\n');
  expect(baseline).toContain('-- Canonical SHA256: '+createHash('sha256').update(original).digest('hex')+'\n');
  expect(baseline.slice(baseline.indexOf(marker)+marker.length)).toBe(original);
 });
 it('appends after draft revision 0061 while retaining every existing source file',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0061_digital_office_draft_revision_guard_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0062_digital_office_reply_draft_singleton_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(63);
  expect(read(root+'0057_digital_office_composer_drafts_foundation_v1.sql')).toContain('create table if not exists public.office_drafts (');
 });
 it('serializes first-save per instance, author and thread with transaction-scoped advisory lock',()=>{
  expect(original).toContain('pg_advisory_xact_lock(');
  expect(original).toContain('new.instance_id::text');
  expect(original).toContain('new.author_user_id::text');
  expect(original).toContain('new.thread_id::text');
  expect(original).toContain("if new.draft_type<>'reply' or new.thread_id is null then");
 });
 it('rejects a second matching reply draft but excludes updates to itself',()=>{
  expect(original).toContain('where d.instance_id=new.instance_id');
  expect(original).toContain('and d.author_user_id=new.author_user_id');
  expect(original).toContain('and d.thread_id=new.thread_id');
  expect(original).toContain("and d.draft_type='reply'");
  expect(original).toContain('and d.id<>new.id');
  expect(original).toContain('OFFICE_DRAFT_CONFLICT');
 });
 it('adds partial unique index on exact tenant/author/thread triple',()=>{
  expect(original).toContain('create unique index if not exists office_drafts_reply_author_thread_uidx');
  expect(original).toContain('on public.office_drafts(instance_id,author_user_id,thread_id)');
  expect(original).toContain("where draft_type='reply' and thread_id is not null");
 });
 it('installs protected BEFORE INSERT or identity-update trigger without browser direct execute',()=>{
  expect(original).toContain('create trigger office_drafts_single_reply_guard');
  expect(original).toContain('before insert or update of instance_id,author_user_id,thread_id,draft_type on public.office_drafts');
  expect(original).toContain('revoke all on function private.enforce_single_office_reply_draft_v1() from public,anon,authenticated');
  expect(original).not.toMatch(/grant execute on function private\.enforce_single_office_reply_draft_v1\(\) to (?:anon|authenticated)/i);
 });
 it('does not falsely certify real concurrent database or complete Pro Office status',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('63 migrations');
  expect(manifest.notes).toContain('two-session Postgres race');
 });
});
