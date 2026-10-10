import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
const root='supabase/customer-baseline/migrations/';
const src='supabase/migrations/20260909204524_digital_office_team_chat_2_integrity_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const original=read(src),baseline=read(root+'0066_digital_office_team_chat_2_integrity_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';
describe('Core #1186 U10A2 F21 canonical Team Chat 2 table integrity',()=>{
 it('maintains canonical SQL SHA256 and exact body across full 91 lines',()=>{
  expect(baseline).toContain('-- Canonical source: '+src+'\n');
  expect(baseline).toContain('-- Canonical SHA256: '+createHash('sha256').update(original).digest('hex')+'\n');
  expect(baseline.slice(baseline.indexOf(marker)+marker.length)).toBe(original);
 });
 it('appends 0066 immediately after Team Chat 2 foundation 0065',()=>{
  const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
  const i=files.indexOf('0065_digital_office_team_chat_2_foundation_v1.sql');
  expect(i).toBeGreaterThan(0);
  expect(files[i+1]).toBe('0066_digital_office_team_chat_2_integrity_v1.sql');
  expect(files.length).toBeGreaterThanOrEqual(68);
 });
 it('requires mentions to reference internal messages and the original author',()=>{
  expect(original).toContain('create or replace function private.enforce_office_message_mention_integrity_v1()');
  expect(original).toContain("v_message.kind<>'internal'");
  expect(original).toContain('v_message.author_id is distinct from new.mentioned_by');
  expect(original).toContain('OFFICE_MENTION_MESSAGE_INTEGRITY_INVALID');
  expect(original).toContain("v_thread.conversation_type not in ('internal_private','internal_group')");
  expect(original).toContain('OFFICE_MENTION_THREAD_INTEGRITY_INVALID');
 });
 it('blocks self-mentions and private chat user without read access',()=>{
  expect(original).toContain('new.mentioned_user_id=new.mentioned_by');
  expect(original).toContain('public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.mentioned_user_id)');
  expect(original).toContain('OFFICE_MENTION_PARTICIPANT_REQUIRED');
 });
 it('requires object link message author, internal thread, creator permissions and tenant object',()=>{
  expect(original).toContain('create or replace function private.enforce_office_message_object_integrity_v1()');
  expect(original).toContain('v_message.author_id is distinct from new.created_by');
  expect(original).toContain('OFFICE_OBJECT_MESSAGE_INTEGRITY_INVALID');
  expect(original).toContain('OFFICE_OBJECT_THREAD_INTEGRITY_INVALID');
  expect(original).toContain('public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.created_by)');
  expect(original).toContain('public.can_manage_support(new.instance_id,new.created_by)');
  expect(original).toContain('private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id)');
  expect(original).toContain('OFFICE_OBJECT_LINK_NOT_FOUND');
 });
 it('installs both BEFORE INSERT and identity UPDATE triggers, not just RPC validation',()=>{
  expect(original).toContain('create trigger office_message_mentions_integrity');
  expect(original).toContain('before insert or update of message_id,thread_id,instance_id,mentioned_user_id,mentioned_by');
  expect(original).toContain('create trigger office_message_object_links_integrity');
  expect(original).toContain('before insert or update of message_id,thread_id,instance_id,object_type,object_id,created_by');
  expect(original).toContain('for each row execute function private.enforce_office_message_mention_integrity_v1()');
  expect(original).toContain('for each row execute function private.enforce_office_message_object_integrity_v1()');
 });
 it('does not expose private validator functions to browser execute roles',()=>{
  expect(original).toContain('revoke all on function private.enforce_office_message_mention_integrity_v1() from public,anon,authenticated');
  expect(original).toContain('revoke all on function private.enforce_office_message_object_integrity_v1() from public,anon,authenticated');
  expect(read(root+'0065_digital_office_team_chat_2_foundation_v1.sql')).toContain('revoke all on table public.office_message_mentions from public,anon,authenticated');
 });
 it('keeps final native Supabase actor and entitlement proof blocked',()=>{
  expect(manifest.status).toBe('snapshot-reviewed');
  expect(manifest.freshInstallProofRequired).toBe(true);
  expect(manifest.proofContractSha256).toBeNull();
  expect(manifest.notes).toContain('68 reviewed migrations');
  expect(manifest.notes).toContain('Team Chat owner transfer');
 });
});
