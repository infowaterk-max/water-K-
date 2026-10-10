import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';

const root='supabase/customer-baseline/migrations/';
const sourcePath='supabase/migrations/20260908023500_digital_office_private_author_read_sync_v1.sql';
const read=(p:string)=>readFileSync(p,'utf8');
const source=read(sourcePath);
const baseline=read(root+'0052_digital_office_private_author_read_sync_v1.sql');
const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2 F5 — private Office author read-state sync baseline',()=>{
 it('preserves canonical SQL verbatim with SHA-256 provenance',()=>{
   const hash=createHash('sha256').update(source).digest('hex');
   expect(baseline).toContain('-- Canonical source: '+sourcePath+'\n');
   expect(baseline).toContain('-- Canonical SHA256: '+hash+'\n');
   expect(baseline.slice(baseline.indexOf(marker)+marker.length)).toBe(source);
 });
 it('follows the 0050–0051 privacy/leave chain without pinning the final filename',()=>{
   const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
   const i=files.indexOf('0050_digital_office_privacy_foundation_v1.sql');
   expect(i).toBeGreaterThan(0);
   expect(files[i+1]).toBe('0051_digital_office_privacy_membership_hardening_v1.sql');
   expect(files[i+2]).toBe('0052_digital_office_private_author_read_sync_v1.sql');
   expect(files.length).toBeGreaterThanOrEqual(53);
   expect(read(root+'0050_digital_office_privacy_foundation_v1.sql')).toContain('office_thread_participants');
 });
 it('only processes internal messages in private/group tenant-bound threads',()=>{
   expect(source).toContain("new.author_id is null or new.kind<>'internal'");
   expect(source).toContain('where t.id=new.thread_id');
   expect(source).toContain('and t.instance_id=new.instance_id');
   expect(source).toContain("t.conversation_type in ('internal_private','internal_group')");
   expect(source).toContain('where p.instance_id=new.instance_id');
   expect(source).toContain('and p.thread_id=new.thread_id');
   expect(source).toContain('and p.user_id=new.author_id');
 });
 it('never reactivates exited authors and never rewinds a read marker',()=>{
   expect(source).toContain('and p.left_at is null');
   expect(source).toContain("OFFICE_PRIVATE_AUTHOR_PARTICIPANT_REQUIRED");
   expect(source).toContain('when p.last_read_at is null or p.last_read_at<new.created_at then new.created_at');
   expect(source).toContain('else p.last_read_at');
   expect(source).not.toMatch(/\binsert\s+into\s+public\.office_thread_participants\b/i);
 });
 it('runs after message insert with private helper hidden from browser roles',()=>{
   expect(source).toContain('create trigger office_messages_private_author_read_sync');
   expect(source).toContain('after insert on public.office_messages');
   expect(source).toContain('execute function private.sync_private_office_author_read_v1()');
   expect(source).toContain('revoke all on function private.sync_private_office_author_read_v1() from public,anon,authenticated');
 });
 it('retains unproved Fresh Install status and previous Alap/Team Chat split',()=>{
   expect(manifest.status).toBe('snapshot-reviewed');
   expect(manifest.freshInstallProofRequired).toBe(true);
   expect(manifest.proofContractSha256).toBeNull();
   expect(manifest.notes).toContain('53 reviewed migrations');
   expect(manifest.notes).toContain('0053+');
   const old=read(root+'0046_alap_team_chat_plan_grant_reconcile.sql');
   for(const code of ['officeCommunication','support','teamChat'])expect(old).toContain("capability_code = '"+code+"'");
 });
});
