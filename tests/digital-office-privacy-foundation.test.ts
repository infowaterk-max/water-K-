import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

const migration=()=>read('supabase/migrations/20260908022500_digital_office_privacy_foundation_v1.sql');

describe('Digital Office privacy foundation',()=>{
  it('adds explicit customer/private/group thread types and per-user read state',()=>{
    const sql=migration();
    expect(sql).toContain("conversation_type in ('customer','internal_private','internal_group')");
    expect(sql).toContain('create table if not exists public.office_thread_participants');
    expect(sql).toContain('last_read_at timestamptz');
    expect(sql).toContain('primary key(instance_id,thread_id,user_id)');
    expect(sql).toContain('office_threads_customer_participant_sync');
  });

  it('makes participant membership a hard boundary before internal-chat capability',()=>{
    const sql=migration();
    const participantCheck=sql.indexOf('if not private.office_active_participant_v1');
    const capabilityCheck=sql.indexOf("'office.internal_chat'",participantCheck);
    expect(participantCheck).toBeGreaterThan(0);
    expect(capabilityCheck).toBeGreaterThan(participantCheck);
    expect(sql).toContain('capability or elevated role NEVER replaces participant membership');
    expect(sql).not.toContain('office.private_chat.read');
  });

  it('preserves customer support access while making internal reads participant-aware at RLS',()=>{
    const sql=migration();
    expect(sql).toContain("if v_thread.conversation_type='customer' then");
    expect(sql).toContain('return public.can_manage_support(p_instance_id,p_user_id)');
    expect(sql).toContain('create policy office_threads_store_all');
    expect(sql).toContain('public.can_read_office_thread_v1(instance_id,id,(select auth.uid()))');
    expect(sql).toContain('create policy office_messages_store_all');
    expect(sql).toContain('public.can_read_office_thread_v1(instance_id,thread_id,(select auth.uid()))');
  });

  it('removes anonymous access and authenticated browser writes from Office tables',()=>{
    const sql=migration();
    for(const table of ['office_threads','office_messages','office_tasks']){
      expect(sql).toContain(`revoke all on table public.${table} from anon`);
      expect(sql).toContain(`revoke insert,update,delete,truncate,references,trigger on table public.${table} from authenticated`);
      expect(sql).toContain(`grant select on table public.${table} to authenticated`);
    }
    expect(sql).toContain('revoke all on table public.office_thread_participants from anon,authenticated');
  });

  it('keeps private mutations service-only, audited and body-free in audit metadata',()=>{
    const sql=migration();
    expect(sql).toContain('public.admin_mutate_office_privacy_v1');
    expect(sql).toContain("'office.private_thread_created'");
    expect(sql).toContain("'office.private_message_added'");
    expect(sql).toContain("'participantCount',v_participant_count");
    expect(sql).not.toContain("jsonb_build_object('body'");
    expect(sql).toContain('grant execute on function public.admin_mutate_office_privacy_v1(uuid,uuid,text,jsonb) to service_role');
  });

  it('uses accessible thread ids before loading private messages and supports real assignees',()=>{
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    const actions=read('src/app/admin/kommunikacio/iroda/actions.ts');
    expect(page).toContain("db.rpc('office_accessible_thread_ids_v1'");
    expect(page).toContain(".in('thread_id',threadIds)");
    expect(page).toContain("name=\"assigneeUserId\"");
    expect(page).toContain('createPrivateThreadAction');
    expect(page).toContain('addPrivateMessageAction');
    expect(actions).toContain("action:'update_customer_thread'");
    expect(actions).toContain("action:'mark_read'");
    expect(actions).toContain("action:'create_internal_thread'");
    expect(actions).toContain("action:'add_internal_message'");
    expect(actions).not.toContain("ownerSelf:owner==='self'");
  });
});
