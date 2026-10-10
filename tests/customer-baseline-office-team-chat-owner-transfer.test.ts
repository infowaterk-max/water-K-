import{describe,expect,it}from'vitest';
import{readFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';
const dir='supabase/customer-baseline/migrations/';
const src='supabase/migrations/20260909204547_digital_office_team_chat_owner_transfer_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const canonical=read(src),target=read(dir+'0067_digital_office_team_chat_owner_transfer_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 F22 canonical Team Chat 2 owner transfer',()=>{
 it('contains exactly original canonical SQL body with SHA256',()=>{
  expect(target).toContain('-- Canonical source: '+src+'\n');
  expect(target).toContain('-- Canonical SHA256: '+createHash('sha256').update(canonical).digest('hex')+'\n');
  expect(target.slice(target.indexOf(marker)+marker.length)).toBe(canonical);
 });
 it('follows Team Chat foundation and integrity, without altering old migration files',()=>{
  const files=readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
  const i=files.indexOf('0065_digital_office_team_chat_2_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0066_digital_office_team_chat_2_integrity_v1.sql');
  expect(files[i+2]).toBe('0067_digital_office_team_chat_owner_transfer_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(69);
 });
 it('requires current active owner, valid internal thread and distinct member target',()=>{
  expect(canonical).toContain('create or replace function public.admin_transfer_office_thread_owner_v1(');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_IDENTITY_REQUIRED');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_SELF_FORBIDDEN');
  expect(canonical).toContain("conversation_type in ('internal_private','internal_group')");
  expect(canonical).toContain('private.office_active_thread_owner_v1(p_instance_id,p_thread_id,p_actor)');
  expect(canonical).toContain('OFFICE_THREAD_OWNER_REQUIRED');
  expect(canonical).toContain("participant_role='member'");
  expect(canonical).toContain('left_at is null');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_TARGET_MEMBER_REQUIRED');
 });
 it('requires read permission for both owner and target in scoped instance/thread',()=>{
  expect(canonical).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor)');
  expect(canonical).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_target_user_id)');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_TARGET_ACCESS_REQUIRED');
  expect(canonical).toContain('instance_id=p_instance_id');
  expect(canonical).toContain('thread_id=p_thread_id');
 });
 it('serializes and atomically demotes old owner before promotion, validating row counts',()=>{
  expect((canonical.match(/for update;/g)??[]).length).toBeGreaterThanOrEqual(2);
  const demote=canonical.indexOf("set participant_role='member',updated_at=now()");
  const promote=canonical.indexOf("set participant_role='owner',updated_at=now()");
  expect(demote).toBeGreaterThan(0);
  expect(promote).toBeGreaterThan(demote);
  expect(canonical).toContain('get diagnostics v_actor_updated=row_count');
  expect(canonical).toContain('get diagnostics v_target_updated=row_count');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_SOURCE_EVIDENCE_MISSING');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_TARGET_EVIDENCE_MISSING');
  expect(canonical).toContain('OFFICE_OWNER_TRANSFER_FINAL_EVIDENCE_MISSING');
 });
 it('records audit and keeps EXECUTE service role only',()=>{
  expect(canonical).toContain('insert into public.admin_audit_log(');
  expect(canonical).toContain('revoke all on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated');
  expect(canonical).toContain('grant execute on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) to service_role');
 });
 it('does not claim hosted Supabase, native actor proof or commercial completion',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('69 SQL migration baseline');
  expect(manifest.notes).toContain('native actor/tenant/Pro proofs still required');
 });
});
