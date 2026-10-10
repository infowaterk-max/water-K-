import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';
const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260908034600_digital_office_drafts_tenant_integrity_v1.sql';
const read=(f:string)=>readFileSync(f,'utf8');
const source=read(sourcePath);
const target=read(root+'0059_digital_office_drafts_tenant_integrity_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F12 direct tenant FK for threadless Office drafts',()=>{
 it('preserves exact canonical SQL with SHA256 provenance',()=>{
  expect(target).toContain('-- Canonical source: '+sourcePath+'\n');
  expect(target).toContain('-- Canonical SHA256: '+createHash('sha256').update(source).digest('hex')+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('appends 0059 after canonical 0057 composer and 0058 reply guard',()=>{
  const names=readdirSync(root).filter(f=>f.endsWith('.sql')).sort();
  const i=names.indexOf('0057_digital_office_composer_drafts_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(names[i+1]).toBe('0058_digital_office_reply_queue_guard_v1.sql');
  expect(names[i+2]).toBe('0059_digital_office_drafts_tenant_integrity_v1.sql');
  expect(names.length).toBeGreaterThanOrEqual(60);
 });
 it('adds direct tenant FK on instance_id even when draft thread_id is null',()=>{
  expect(source).toContain('alter table public.office_drafts');
  expect(source).toContain('drop constraint if exists office_drafts_instance_id_fkey');
  expect(source).toContain('add constraint office_drafts_instance_id_fkey');
  expect(source).toContain('foreign key(instance_id) references public.webshop_instances(id) on delete cascade');
  const f10=read(root+'0057_digital_office_composer_drafts_foundation_v1.sql');
  expect(f10).toContain("draft_type in ('new_email','reply')");
  expect(f10).toContain("draft_type='new_email' and thread_id is null");
 });
 it('indexes author plus tenant in canonical order',()=>{
  expect(source).toContain('create index if not exists office_drafts_author_instance_idx');
  expect(source).toContain('on public.office_drafts(author_user_id,instance_id)');
 });
 it('does not change browser draft grants or conceal reply UPDATE bypass',()=>{
  const f10=read(root+'0057_digital_office_composer_drafts_foundation_v1.sql');
  expect(f10).toContain('alter table public.office_drafts enable row level security');
  expect(f10).toContain('revoke all on table public.office_drafts from public,anon,authenticated');
  expect(target).toContain('0058 canonical queue trigger does not validate UPDATE');
  expect(read(root+'0058_digital_office_reply_queue_guard_v1.sql')).toContain('before insert on public.communication_jobs');
 });
 it('retains 60 source migrations without claiming runtime DB security',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('60-migration baseline');
  expect(manifest.notes).toContain('queue UPDATE bypass');
 });
});
