import{describe,expect,it}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';

const root='supabase/customer-baseline/migrations/';
const canonicalPath='supabase/migrations/20260908023000_digital_office_privacy_membership_hardening_v1.sql';
const source=readFileSync(canonicalPath,'utf8');
const target=readFileSync(root+'0051_digital_office_privacy_membership_hardening_v1.sql','utf8');
const manifest=JSON.parse(readFileSync('supabase/customer-baseline/manifest.json','utf8'));
const marker='-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.\n';

describe('Core #1186 U10A2 F4 membership and assignee privacy baseline',()=>{
 it('preserves the complete canonical source SQL and its SHA256 identity',()=>{
   const hash=createHash('sha256').update(source).digest('hex');
   expect(target).toContain('-- Canonical source: '+canonicalPath+'\n');
   expect(target).toContain('-- Canonical SHA256: '+hash+'\n');
   expect(target.slice(target.indexOf(marker)+marker.length)).toBe(source);
 });
 it('appears after the canonical participant foundation without rewriting predecessors',()=>{
   const files=readdirSync(root).filter(x=>x.endsWith('.sql')).sort();
   const prior=files.indexOf('0050_digital_office_privacy_foundation_v1.sql');
   expect(prior).toBeGreaterThanOrEqual(0);
   expect(files[prior+1]).toBe('0051_digital_office_privacy_membership_hardening_v1.sql');
   expect(files.length).toBeGreaterThanOrEqual(52);
   expect(readFileSync(root+'0050_digital_office_privacy_foundation_v1.sql','utf8')).toContain('private.office_active_participant_v1');
 });
 it('restricts customer thread assignees to active support-capable store staff',()=>{
   expect(source).toContain('create or replace function private.enforce_customer_office_assignee_v1()');
   expect(source).toContain("new.conversation_type='customer'");
   expect(source).toContain('private.office_active_store_member_v1(new.instance_id,new.assigned_to)');
   expect(source).toContain('public.can_manage_support(new.instance_id,new.assigned_to)');
   expect(source).toContain('OFFICE_ASSIGNEE_NOT_ELIGIBLE');
   expect(source).toContain('create trigger office_threads_assignee_eligibility');
   expect(source).toContain('before insert or update of assigned_to,conversation_type on public.office_threads');
 });
 it('fails closed on cross-instance, customer-thread and nonparticipant private leave',()=>{
   const start=source.indexOf('create or replace function public.office_leave_private_thread_v1(');
   expect(start).toBeGreaterThan(0);
   const sql=source.slice(start);
   expect(sql).toContain('p_instance_id is null or p_actor is null or p_thread_id is null');
   expect(sql).toContain('where id=p_thread_id and instance_id=p_instance_id');
   expect(sql).toContain("'internal_private','internal_group'");
   expect(sql).toContain('OFFICE_INTERNAL_THREAD_NOT_FOUND');
   expect(sql).toContain('where instance_id=p_instance_id and thread_id=p_thread_id and user_id=p_actor and left_at is null');
   expect(sql).toContain('OFFICE_PRIVATE_PARTICIPANT_NOT_ACTIVE');
 });
 it('immediately invalidates active participant status with audited leave event',()=>{
   expect(source).toContain('set left_at=v_left_at,updated_at=v_left_at');
   expect(source).toContain('insert into public.admin_audit_log(');
   expect(source).toContain("'office.private_thread_left'");
   expect(source).toContain('revoke all on function public.office_leave_private_thread_v1(uuid,uuid,uuid) from public,anon,authenticated');
   expect(source).toContain('grant execute on function public.office_leave_private_thread_v1(uuid,uuid,uuid) to service_role');
   expect(source).not.toMatch(/\bgrant execute on function public\.office_leave_private_thread_v1\([^)]*\) to (anon|authenticated)\b/i);
 });
 it('keeps baseline unproved and prior Alap/Team Chat plan split intact',()=>{
   expect(manifest.status).toBe('snapshot-reviewed');
   expect(manifest.freshInstallProofRequired).toBe(true);
   expect(manifest.proofContractSha256).toBeNull();
   expect(manifest.notes).toContain('52 migrations');
   expect(target).toContain('service_role actor binding');
   const prior=readFileSync(root+'0046_alap_team_chat_plan_grant_reconcile.sql','utf8');
   for(const code of ['officeCommunication','support','teamChat']){
    expect(prior).toContain("capability_code = '"+code+"'");
   }
 });
});

