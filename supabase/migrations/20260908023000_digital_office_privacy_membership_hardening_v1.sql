-- Digital Office privacy membership hardening.
-- Customer assignees must be real active support-capable store members.
-- Private participants can explicitly leave; leaving immediately removes future read access.

create or replace function private.enforce_customer_office_assignee_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.conversation_type='customer' and new.assigned_to is not null then
    if not private.office_active_store_member_v1(new.instance_id,new.assigned_to)
       or not public.can_manage_support(new.instance_id,new.assigned_to) then
      raise exception 'OFFICE_ASSIGNEE_NOT_ELIGIBLE';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists office_threads_assignee_eligibility on public.office_threads;
create trigger office_threads_assignee_eligibility
before insert or update of assigned_to,conversation_type on public.office_threads
for each row execute function private.enforce_customer_office_assignee_v1();

create or replace function public.office_leave_private_thread_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_thread_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_type text;
  v_left_at timestamptz:=now();
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select conversation_type into v_type
  from public.office_threads
  where id=p_thread_id and instance_id=p_instance_id
  for update;
  if not found or v_type not in ('internal_private','internal_group') then raise exception 'OFFICE_INTERNAL_THREAD_NOT_FOUND'; end if;

  update public.office_thread_participants
  set left_at=v_left_at,updated_at=v_left_at
  where instance_id=p_instance_id and thread_id=p_thread_id and user_id=p_actor and left_at is null;
  if not found then raise exception 'OFFICE_PRIVATE_PARTICIPANT_NOT_ACTIVE'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,'office.private_thread_left','office_thread',p_thread_id::text,v_org,p_instance_id,
    'Résztvevő kilépett a privát belső beszélgetésből',
    jsonb_build_object('threadId',p_thread_id,'leftAt',v_left_at),
    jsonb_build_object('audit_source','database_rpc','rpc','office_leave_private_thread_v1')
  );

  return jsonb_build_object('id',p_thread_id,'threadId',p_thread_id,'userId',p_actor,'left',true,'leftAt',v_left_at);
end;
$$;

revoke all on function private.enforce_customer_office_assignee_v1() from public,anon,authenticated;
revoke all on function public.office_leave_private_thread_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.office_leave_private_thread_v1(uuid,uuid,uuid) to service_role;
