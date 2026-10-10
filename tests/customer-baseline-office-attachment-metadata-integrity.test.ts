import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';
const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260909203629_digital_office_attachment_metadata_integrity_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourcePath);
const target=read(root+'0064_digital_office_attachment_metadata_integrity_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F17 canonical Office attachment metadata integrity',()=>{
 it('is complete exact canonical SQL with SHA256 provenance',()=>{
  expect(target).toContain('-- Canonical source: '+sourcePath+'\n');
  expect(target).toContain('-- Canonical SHA256: '+createHash('sha256').update(source).digest('hex')+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('follows attachment metadata 0063 with append-only future compatibility',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0063_digital_office_recipient_envelope_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0064_digital_office_attachment_metadata_integrity_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(65);
  expect(read(root+'0063_digital_office_recipient_envelope_v1.sql')).toContain('create table if not exists public.office_attachments (');
 });
 it('requires both private Storage bucket and path or neither',()=>{
  expect(source).toContain('drop constraint if exists office_attachments_storage_pair_check');
  expect(source).toContain('add constraint office_attachments_storage_pair_check');
  expect(source).toContain('check ((storage_bucket is null) = (storage_path is null))');
 });
 it('denies ready without complete Storage locator or nonblank provider attachment ID',()=>{
  expect(source).toContain('drop constraint if exists office_attachments_ready_locator_check');
  expect(source).toContain('add constraint office_attachments_ready_locator_check');
  expect(source).toContain("status<>'ready'");
  expect(source).toContain('(storage_bucket is not null and storage_path is not null)');
  expect(source).toContain("nullif(trim(provider_attachment_id),'') is not null");
 });
 it('denies deleted metadata retaining bucket/path or provider locator',()=>{
  expect(source).toContain('drop constraint if exists office_attachments_deleted_locator_check');
  expect(source).toContain('add constraint office_attachments_deleted_locator_check');
  expect(source).toContain("status<>'deleted'");
  expect(source).toContain('storage_bucket is null and storage_path is null and provider_attachment_id is null');
 });
 it('preserves all three explanatory data integrity comments and private table grants',()=>{
  for(const name of ['storage_pair','ready_locator','deleted_locator']){
   expect(source).toContain('comment on constraint office_attachments_'+name+'_check on public.office_attachments');
  }
  const base=read(root+'0063_digital_office_recipient_envelope_v1.sql');
  expect(base).toContain('alter table public.office_attachments enable row level security');
  expect(base).toContain('revoke all on table public.office_attachments from public,anon,authenticated');
 });
 it('stays 65-migration source-only with real Storage and PostgreSQL proof outstanding',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('65 migrations snapshot-reviewed');
  expect(target).toContain('no actual PostgreSQL CHECK');
 });
});
