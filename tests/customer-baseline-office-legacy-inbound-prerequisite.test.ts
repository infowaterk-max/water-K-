import{describe,it,expect}from 'vitest';
import{readFileSync,readdirSync}from 'node:fs';
import{createHash}from 'node:crypto';
const dir='supabase/customer-baseline/migrations/';
const canonicalName='supabase/migrations/20260903180000_inbound_office_email_atomic_v2.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const canonical=read(canonicalName);
const source=read(dir+'0053_inbound_office_email_atomic_v2.sql');
const subsequent=read(dir+'0054_digital_office_real_inbound_foundation_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const bodyMarker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 F18 actual PostgreSQL discovered Office inbound v2 predecessor',()=>{
 it('adds full source without replacing sender-only v2 with an invented stub',()=>{
  const h=createHash('sha256').update(canonical).digest('hex');
  expect(source).toContain('-- Canonical source: '+canonicalName+'\n');
  expect(source).toContain('-- Canonical SHA256: '+h+'\n');
  expect(source.slice(source.indexOf(bodyMarker)+bodyMarker.length)).toBe(canonical);
  expect(canonical).toContain('create or replace function public.record_inbound_office_email_v2(');
 });
 it('places v2 producer after the previously reviewed 0053 and strictly before 0054 revoke',()=>{
  const files=readdirSync(dir).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0053_digital_office_rls_helper_exposure_closure_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0053_inbound_office_email_atomic_v2.sql');
  expect(files[i+2]).toBe('0054_digital_office_real_inbound_foundation_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(66);
 });
 it('retains original source v2 service role grant ONLY for offline pre-0054 migration',()=>{
  expect(canonical).toContain('revoke all on function public.record_inbound_office_email_v2(text,text,text,text,text)');
  expect(canonical).toContain('from public,anon,authenticated;');
  expect(canonical).toContain('grant execute on function public.record_inbound_office_email_v2(text,text,text,text,text)');
  expect(canonical).toContain('to service_role;');
  expect(source).toContain('Offline bootstrap only');
 });
 it('requires 0054 to immediately retire service_role legacy v2 and install v3',()=>{
  expect(subsequent).toContain('create or replace function public.record_inbound_office_email_v3(');
  expect(subsequent).toContain('revoke all on function public.record_inbound_office_email_v2(text,text,text,text,text)');
  expect(subsequent).toMatch(/revoke all on function public\.record_inbound_office_email_v2\(text,text,text,text,text\)\s+from public,anon,authenticated,service_role;/i);
  expect(subsequent).toMatch(/grant execute on function public\.record_inbound_office_email_v3\([^;]*?\)\s+to service_role;/is);
  expect(subsequent).toContain('INBOUND_MAILBOX_NOT_FOUND');
 });
 it('preserves immutable prior baseline source and full real target proof requirement',()=>{
  expect(read(dir+'0053_digital_office_rls_helper_exposure_closure_v1.sql')).toContain('-- Canonical source: supabase/migrations/20260908024000_digital_office_rls_helper_exposure_closure_v1.sql');
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('Baseline now 66 migration files');
  expect(manifest.notes).toContain('isolated PostgreSQL 18 fresh replay');
 });
});
