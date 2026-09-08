-- Digital Office privacy foundation v1.
-- Customer threads keep the existing support-team visibility contract.
-- Internal private/group threads are participant-only even for store owners/platform operators.
-- Browser writes are removed; mutations stay on audited service-role RPC paths.

alter table public.office_threads
  add column if not exists conversation_type text not null default 'customer',
  add column if not exists topic_code text,
  add column if not exists mailbox_key text;

alter table public.office_threads
  drop constraint if exists office_threads_conversation_type_check;
alter table public.office_threads
  add constraint office_threads_conversation_type_check
  check (conversation_type in ('customer','internal_private','internal_group'));

create unique index if not exists office_threads_id_instance_unique
  on public.office_threads(id,instance_id);
create index if not exists office_threads_instance_type_updated_idx
  on public.office_threads(instance_id,conversation_type,updated_at desc);

create table if not exists public.office_thread_participants (
  instance_id uuid not null,
  thread_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_role text not null default 'member' check (participant_role in ('member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(instance_id,thread_id,user_id),
  foreign key(thread_id,instance_id) references public.office_threads(id,instance_id) on delete cascade,
  check (left_at is null or left_at>=joined_at)
);

create index if not exists office_thread_participants_user_active_idx
  on public.office_thread_participants(instance_id,user_id,thread_id)
  where left_at is null;
create index if not exists office_thread_participants_thread_active_idx
  on public.office_thread_participants(instance_id,thread_id,user_id)
  where left_at is null;

alter table public.office_thread_participants enable row level security;
revoke all on table public.office_thread_participants from anon,authenticated;
grant select,insert,update,delete on table public.office_thread_participants to service_role;

-- Preserve existing read state for the person who created/owns each historical customer thread.
insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
select t.instance_id,t.id,t.created_by,coalesce(t.last_read_at,t.created_at),t.created_by
from public.office_threads t
where t.created_by is not null and t.conversation_type='customer'
on conflict(instance_id,thread_id,user_id) do nothing;

insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
select t.instance_id,t.id,t.assigned_to,coalesce(t.last_read_at,t.created_at),t.created_by
from public.office_threads t
where t.assigned_to is not null and t.conversation_type='customer'
on conflict(instance_id,thread_id,user_id) do nothing;

create or replace function private.office_active_store_member_v1(
  p_instance_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
set search_path=''
as $$
  select exists(
    select 1
    from public.webshop_instances w
    join public.role_bindings rb on rb.organization_id=w.organization_id
    where w.id=p_instance_id
      and rb.user_id=p_user_id
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.revoked_at is null
      and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
  );
$$;

create or replace function private.office_active_participant_v1(
  p_instance_id uuid,
  p_thread_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
set search_path=''
as $$
  select exists(
    select 1
    from public.office_thread_participants p
    where p.instance_id=p_instance_id
      and p.thread_id=p_thread_id
      and p.user_id=p_user_id
      and p.joined_at<=now()
      and p.left_at is null
  );
$$;

create or replace function public.can_read_office_thread_v1(
  p_instance_id uuid,
  p_thread_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_thread public.office_threads%rowtype;
  v_capability jsonb;
begin
  if p_instance_id is null or p_thread_id is null or p_user_id is null then return false; end if;
  select * into v_thread
  from public.office_threads
  where id=p_thread_id and instance_id=p_instance_id;
  if not found then return false; end if;

  if v_thread.conversation_type='customer' then
    return public.can_manage_support(p_instance_id,p_user_id);
  end if;

  -- Hard privacy boundary: capability or elevated role NEVER replaces participant membership.
  if not private.office_active_participant_v1(p_instance_id,p_thread_id,p_user_id) then return false; end if;
  v_capability:=public.evaluate_store_capability_v1(
    p_instance_id,p_user_id,'office.internal_chat',p_user_id,p_user_id,v_thread.topic_code,v_thread.mailbox_key
  );
  return coalesce((v_capability->>'allowed')::boolean,false);
end;
$$;

create or replace function public.office_accessible_thread_ids_v1(
  p_instance_id uuid,
  p_user_id uuid
) returns table(thread_id uuid)
language sql
stable
security definer
set search_path=''
as $$
  select t.id
  from public.office_threads t
  where t.instance_id=p_instance_id
    and public.can_read_office_thread_v1(p_instance_id,t.id,p_user_id);
$$;

-- Participant-aware browser read policies. No browser writes remain.
drop policy if exists office_threads_store_all on public.office_threads;
create policy office_threads_store_all on public.office_threads
  for select to authenticated
  using (public.can_read_office_thread_v1(instance_id,id,(select auth.uid())));

drop policy if exists office_messages_store_all on public.office_messages;
create policy office_messages_store_all on public.office_messages
  for select to authenticated
  using (public.can_read_office_thread_v1(instance_id,thread_id,(select auth.uid())));

drop policy if exists office_tasks_store_all on public.office_tasks;
create policy office_tasks_store_all on public.office_tasks
  for select to authenticated
  using (
    (thread_id is null and public.can_manage_support(instance_id,(select auth.uid())))
    or (thread_id is not null and public.can_read_office_thread_v1(instance_id,thread_id,(select auth.uid())))
  );

revoke all on table public.office_threads from anon;
revoke all on table public.office_messages from anon;
revoke all on table public.office_tasks from anon;
revoke insert,update,delete,truncate,references,trigger on table public.office_threads from authenticated;
revoke insert,update,delete,truncate,references,trigger on table public.office_messages from authenticated;
revoke insert,update,delete,truncate,references,trigger on table public.office_tasks from authenticated;
grant select on table public.office_threads to authenticated;
grant select on table public.office_messages to authenticated;
grant select on table public.office_tasks to authenticated;

-- Keep a per-user read row synchronized for customer threads created or assigned through legacy v2 actions.
create or replace function private.sync_customer_office_participant_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.conversation_type<>'customer' then return new; end if;
  if tg_op='INSERT' then
    if new.created_by is not null then
      insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
      values(new.instance_id,new.id,new.created_by,coalesce(new.last_read_at,new.created_at),new.created_by)
      on conflict(instance_id,thread_id,user_id) do nothing;
    end if;
    if new.assigned_to is not null then
      insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
      values(new.instance_id,new.id,new.assigned_to,coalesce(new.last_read_at,new.created_at),new.created_by)
      on conflict(instance_id,thread_id,user_id) do nothing;
    end if;
  elsif new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
    values(new.instance_id,new.id,new.assigned_to,null,new.created_by)
    on conflict(instance_id,thread_id,user_id) do update
      set left_at=null,updated_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists office_threads_customer_participant_sync on public.office_threads;
create trigger office_threads_customer_participant_sync
after insert or update of assigned_to on public.office_threads
for each row execute function private.sync_customer_office_participant_v1();

create or replace function public.admin_mutate_office_privacy_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_action text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_thread public.office_threads%rowtype;
  v_thread_after public.office_threads%rowtype;
  v_thread_id uuid;
  v_message_id uuid;
  v_subject text;
  v_body text;
  v_status text;
  v_priority text;
  v_assignee uuid;
  v_participant uuid;
  v_participants uuid[];
  v_participant_count int;
  v_conversation_type text;
  v_capability jsonb;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_PAYLOAD_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='mark_read' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;
    insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
    values(p_instance_id,v_thread_id,p_actor,now(),p_actor)
    on conflict(instance_id,thread_id,user_id) do update
      set last_read_at=now(),left_at=null,updated_at=now();
    return jsonb_build_object('id',v_thread_id,'threadId',v_thread_id,'userId',p_actor,'lastReadAt',now());
  end if;

  if p_action='update_customer_thread' then
    if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_status:=coalesce(p_payload->>'status','open');
    v_priority:=coalesce(p_payload->>'priority','normal');
    v_assignee:=case when nullif(trim(coalesce(p_payload->>'assigneeUserId','')),'') is null then null else (p_payload->>'assigneeUserId')::uuid end;
    if v_status not in ('open','closed') or v_priority not in ('low','normal','high','urgent') then raise exception 'OFFICE_THREAD_STATE_INVALID'; end if;
    select * into v_thread from public.office_threads
      where id=v_thread_id and instance_id=p_instance_id and conversation_type='customer' for update;
    if not found then raise exception 'OFFICE_CUSTOMER_THREAD_NOT_FOUND'; end if;
    if v_assignee is not null and not public.can_manage_support(p_instance_id,v_assignee) then raise exception 'OFFICE_ASSIGNEE_NOT_ELIGIBLE'; end if;

    update public.office_threads
    set status=v_status,priority=v_priority,assigned_to=v_assignee,updated_at=now()
    where id=v_thread_id and instance_id=p_instance_id
    returning * into v_thread_after;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
    ) values(
      p_actor,'office.thread_updated','office_thread',v_thread_id::text,v_org,p_instance_id,
      left(v_thread.subject||' irodai szál módosítva',500),
      jsonb_build_object('status',v_thread.status,'priority',v_thread.priority,'assignedTo',v_thread.assigned_to),
      jsonb_build_object('status',v_thread_after.status,'priority',v_thread_after.priority,'assignedTo',v_thread_after.assigned_to),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_privacy_v1')
    );
    return jsonb_build_object('id',v_thread_id,'threadId',v_thread_id,'status',v_status,'priority',v_priority,'assignedTo',v_assignee);
  end if;

  if p_action='create_internal_thread' then
    if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
    v_capability:=public.evaluate_store_capability_v1(p_instance_id,p_actor,'office.internal_chat',p_actor,p_actor,null,null);
    if not coalesce((v_capability->>'allowed')::boolean,false) then raise exception 'OFFICE_INTERNAL_CHAT_PERMISSION_REQUIRED'; end if;
    v_subject:=trim(coalesce(p_payload->>'subject',''));
    v_body:=trim(coalesce(p_payload->>'body',''));
    if length(v_subject)<1 or length(v_subject)>180 or length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_INTERNAL_THREAD_PAYLOAD_INVALID'; end if;

    select array_agg(distinct x order by x) into v_participants
    from (
      select p_actor x
      union all
      select value::text::uuid from jsonb_array_elements_text(coalesce(p_payload->'participantUserIds','[]'::jsonb))
    ) q;
    v_participant_count:=coalesce(cardinality(v_participants),0);
    if v_participant_count<2 or v_participant_count>25 then raise exception 'OFFICE_INTERNAL_PARTICIPANTS_INVALID'; end if;

    foreach v_participant in array v_participants loop
      if not private.office_active_store_member_v1(p_instance_id,v_participant) then raise exception 'OFFICE_INTERNAL_PARTICIPANT_NOT_ACTIVE'; end if;
      v_capability:=public.evaluate_store_capability_v1(p_instance_id,v_participant,'office.internal_chat',v_participant,v_participant,null,null);
      if not coalesce((v_capability->>'allowed')::boolean,false) then raise exception 'OFFICE_INTERNAL_PARTICIPANT_PERMISSION_REQUIRED'; end if;
    end loop;

    v_conversation_type:=case when v_participant_count=2 then 'internal_private' else 'internal_group' end;
    insert into public.office_threads(instance_id,subject,status,priority,created_by,conversation_type,updated_at)
    values(p_instance_id,v_subject,'open','normal',p_actor,v_conversation_type,now())
    returning * into v_thread_after;

    foreach v_participant in array v_participants loop
      insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
      values(p_instance_id,v_thread_after.id,v_participant,case when v_participant=p_actor then now() else null end,p_actor);
    end loop;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_after.id,p_actor,'internal',v_body)
    returning id into v_message_id;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.private_thread_created','office_thread',v_thread_after.id::text,v_org,p_instance_id,
      'Privát belső irodai beszélgetés létrehozva',
      jsonb_build_object('threadId',v_thread_after.id,'conversationType',v_conversation_type,'participantCount',v_participant_count),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_privacy_v1','messageId',v_message_id)
    );
    return jsonb_build_object('id',v_thread_after.id,'threadId',v_thread_after.id,'messageId',v_message_id,'conversationType',v_conversation_type,'participantCount',v_participant_count);
  end if;

  if p_action='add_internal_message' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_body:=trim(coalesce(p_payload->>'body',''));
    if length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_INTERNAL_MESSAGE_PAYLOAD_INVALID'; end if;
    select * into v_thread from public.office_threads
      where id=v_thread_id and instance_id=p_instance_id and conversation_type in ('internal_private','internal_group') for update;
    if not found then raise exception 'OFFICE_INTERNAL_THREAD_NOT_FOUND'; end if;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_id,p_actor,'internal',v_body)
    returning id into v_message_id;
    update public.office_threads set updated_at=now() where id=v_thread_id and instance_id=p_instance_id;
    update public.office_thread_participants set last_read_at=now(),updated_at=now()
      where instance_id=p_instance_id and thread_id=v_thread_id and user_id=p_actor and left_at is null;
    if not found then raise exception 'OFFICE_PRIVATE_PARTICIPANT_EVIDENCE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,metadata
    ) values(
      p_actor,'office.private_message_added','office_thread',v_thread_id::text,v_org,p_instance_id,
      'Privát belső irodai üzenet hozzáadva',
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_privacy_v1','messageId',v_message_id)
    );
    return jsonb_build_object('id',v_message_id,'threadId',v_thread_id,'messageId',v_message_id);
  end if;

  raise exception 'OFFICE_PRIVACY_ACTION_INVALID';
end;
$$;

revoke all on function private.office_active_store_member_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function private.office_active_participant_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.office_accessible_thread_ids_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_mutate_office_privacy_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid) from public,anon;
grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to authenticated,service_role;
grant execute on function public.office_accessible_thread_ids_v1(uuid,uuid) to service_role;
grant execute on function public.admin_mutate_office_privacy_v1(uuid,uuid,text,jsonb) to service_role;
