import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');
const migration=()=>read('supabase/migrations/20260908023000_digital_office_privacy_membership_hardening_v1.sql');

describe('Digital Office privacy membership hardening',()=>{
  it('requires customer assignees to be active support-capable store members',()=>{
    const sql=migration();
    expect(sql).toContain('private.office_active_store_member_v1(new.instance_id,new.assigned_to)');
    expect(sql).toContain('public.can_manage_support(new.instance_id,new.assigned_to)');
    expect(sql).toContain("raise exception 'OFFICE_ASSIGNEE_NOT_ELIGIBLE'");
    expect(sql).toContain('office_threads_assignee_eligibility');
  });

  it('lets an active private participant leave and records an audit event without message content',()=>{
    const sql=migration();
    expect(sql).toContain('public.office_leave_private_thread_v1');
    expect(sql).toContain('set left_at=v_left_at,updated_at=v_left_at');
    expect(sql).toContain("'office.private_thread_left'");
    expect(sql).toContain("'threadId',p_thread_id,'leftAt',v_left_at");
    expect(sql).not.toContain("'body'");
  });

  it('keeps the leave mutation server-only',()=>{
    const sql=migration();
    expect(sql).toContain('revoke all on function public.office_leave_private_thread_v1(uuid,uuid,uuid) from public,anon,authenticated');
    expect(sql).toContain('grant execute on function public.office_leave_private_thread_v1(uuid,uuid,uuid) to service_role');
  });
});
