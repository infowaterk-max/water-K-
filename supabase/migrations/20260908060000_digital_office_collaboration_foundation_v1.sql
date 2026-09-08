-- Digital Office collaboration foundation v1.
-- Adds explicit @mention evidence, personal notification state and audited customer-thread handoff.
-- Notification rows contain references only: message bodies/private thread content are never copied into notifications.

create table if not exists public.office_message_mentions (
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  message_id uuid not null references public.office_messages(id) on delete cascade,
  thread_id uuid not null,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  mentioned_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(instance_id,message_id,mentioned_user_id),
  foreign key(thread_id,instance_id) references public.office_threads(id,instance_id) on delete cascade
);

create index if not exists office_message_mentions_user_idx
  on public.office_message_mentions(instance_id,mentioned_user_id,created_at desc);
create index if not exists office_message_mentions_thread_idx
  on public.office_message_mentions(instance_id,thread_id,created_at desc);

create table if not exists public.office_user_notifications (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in ('mention','assignment')),
  thread_id uuid not null,
  message_id uuid references public.office_messages(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  foreign key(thread_id,instance_id) references public.office_threads(id,instance_id) on delete cascade,
  check((event_type='mention' and message_id is not null) or (event_type='assignment' and message_id is null)),
  check(read_at is null or read_at>=created_at)
);

create index if not exists office_user_notifications_user_recent_idx
  on public.office_user_notifications(instance_id,user_id,created_at desc);
create index if not exists office_user_notifications_user_unread_idx
  on public.office_user_notifications(instance_id,user_id,created_at desc)
  where read_at is null;
create unique index if not exists office_user_notifications_mention_uidx
  on public.office_user_notifications(instance_id,user_id,event_type,message_id)
  where event_type='mention' and message_id is not null;

alter table public.office_message_mentions enable row level security;
alter table public.office_user_notifications enable row level security;
revoke all on table public.office_message_mentions from public,anon,authenticated;
revoke all on table public.office_user_notifications from public,anon,authenticated;
grant select,insert,update,delete on table public.office_message_mentions to service_role;
grant select,insert,update,delete on table public.office_user_notifications to service_role;

create or replace function public.admin_mutate_office_collaboration_v1(
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
  v_notification_id uuid;
  v_body text;
  v_kind text;
  v_status text;
  v_priority text;
  v_assignee uuid;
  v_mentioned uuid;
  v_mentions uuid[]:='{}'::uuid[];
  v_mention_count int:=0;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_COLLAB_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_COLLAB_PAYLOAD_REQUIRED'; end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='mark_notification_read' then
    v_notification_id:=(p_payload->>'notificationId')::uuid;
    update public.office_user_notifications
    set read_at=coalesce(read_at,now())
    where id=v_notification_id
      and instance_id=p_instance_id
      and user_id=p_actor
    returning thread_id into v_thread_id;
    if not found then raise exception 'OFFICE_NOTIFICATION_NOT_FOUND'; end if;
    return jsonb_build_object('id',v_notification_id,'notificationId',v_notification_id,'threadId',v_thread_id,'read',true);
  end if;

  if p_action='add_message' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_body:=trim(coalesce(p_payload->>'body',''));
    v_kind:=trim(coalesce(p_payload->>'kind','internal'));
    if length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_COLLAB_MESSAGE_INVALID'; end if;

    select * into v_thread
    from public.office_threads
    where id=v_thread_id and instance_id=p_instance_id
    for update;
    if not found then raise exception 'OFFICE_THREAD_NOT_FOUND'; end if;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;

    if v_thread.conversation_type='customer' then
      if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
      if v_kind not in ('internal','note') then raise exception 'OFFICE_COLLAB_MESSAGE_KIND_INVALID'; end if;
    elsif v_thread.conversation_type in ('internal_private','internal_group') then
      if v_kind<>'internal' then raise exception 'OFFICE_COLLAB_MESSAGE_KIND_INVALID'; end if;
    else
      raise exception 'OFFICE_THREAD_TYPE_INVALID';
    end if;

    select coalesce(array_agg(distinct value::uuid order by value::uuid),'{}'::uuid[])
    into v_mentions
    from jsonb_array_elements_text(coalesce(p_payload->'mentionUserIds','[]'::jsonb));
    if cardinality(v_mentions)>25 then raise exception 'OFFICE_MENTION_LIMIT_EXCEEDED'; end if;

    foreach v_mentioned in array v_mentions loop
      if v_mentioned=p_actor then continue; end if;
      if not private.office_active_store_member_v1(p_instance_id,v_mentioned) then raise exception 'OFFICE_MENTION_USER_NOT_ACTIVE'; end if;
      if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,v_mentioned) then raise exception 'OFFICE_MENTION_THREAD_ACCESS_DENIED'; end if;
    end loop;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_id,p_actor,v_kind,v_body)
    returning id into v_message_id;

    foreach v_mentioned in array v_mentions loop
      if v_mentioned=p_actor then continue; end if;
      insert into public.office_message_mentions(instance_id,message_id,thread_id,mentioned_user_id,mentioned_by)
      values(p_instance_id,v_message_id,v_thread_id,v_mentioned,p_actor)
      on conflict(instance_id,message_id,mentioned_user_id) do nothing;
      if found then
        v_mention_count:=v_mention_count+1;
        insert into public.office_user_notifications(instance_id,user_id,event_type,thread_id,message_id,actor_user_id)
        values(p_instance_id,v_mentioned,'mention',v_thread_id,v_message_id,p_actor)
        on conflict(instance_id,user_id,event_type,message_id)
          where event_type='mention' and message_id is not null
        do nothing;
      end if;
    end loop;

    update public.office_threads
    set updated_at=now()
    where id=v_thread_id and instance_id=p_instance_id;

    insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
    values(p_instance_id,v_thread_id,p_actor,now(),p_actor)
    on conflict(instance_id,thread_id,user_id) do update
      set last_read_at=now(),left_at=null,updated_at=now();

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.collaboration_message_added','office_message',v_message_id::text,v_org,p_instance_id,
      case when v_thread.conversation_type='customer' then 'Digitális Iroda belső ügybejegyzés létrehozva' else 'Digitális Iroda belső üzenet létrehozva' end,
      jsonb_build_object('threadId',v_thread_id,'kind',v_kind,'conversationType',v_thread.conversation_type,'mentionCount',v_mention_count),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_collaboration_v1')
    );

    return jsonb_build_object('id',v_message_id,'messageId',v_message_id,'threadId',v_thread_id,'mentionCount',v_mention_count);
  end if;

  if p_action='update_customer_thread' then
    if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_status:=trim(coalesce(p_payload->>'status','open'));
    v_priority:=trim(coalesce(p_payload->>'priority','normal'));
    v_assignee:=case when nullif(trim(coalesce(p_payload->>'assigneeUserId','')),'') is null then null else (p_payload->>'assigneeUserId')::uuid end;
    if v_status not in ('open','closed') or v_priority not in ('low','normal','high','urgent') then raise exception 'OFFICE_THREAD_STATE_INVALID'; end if;

    select * into v_thread
    from public.office_threads
    where id=v_thread_id and instance_id=p_instance_id and conversation_type='customer'
    for update;
    if not found then raise exception 'OFFICE_CUSTOMER_THREAD_NOT_FOUND'; end if;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;

    if v_assignee is not null then
      if not private.office_active_store_member_v1(p_instance_id,v_assignee)
         or not public.can_manage_support(p_instance_id,v_assignee) then
        raise exception 'OFFICE_ASSIGNEE_NOT_ELIGIBLE';
      end if;
    end if;

    update public.office_threads
    set status=v_status,priority=v_priority,assigned_to=v_assignee,updated_at=now()
    where id=v_thread_id and instance_id=p_instance_id
    returning * into v_thread_after;

    if v_assignee is distinct from v_thread.assigned_to and v_assignee is not null and v_assignee<>p_actor then
      insert into public.office_user_notifications(instance_id,user_id,event_type,thread_id,message_id,actor_user_id)
      values(p_instance_id,v_assignee,'assignment',v_thread_id,null,p_actor)
      returning id into v_notification_id;
    end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
    ) values(
      p_actor,'office.thread_updated','office_thread',v_thread_id::text,v_org,p_instance_id,
      left(v_thread.subject||' irodai szál módosítva',500),
      jsonb_build_object('status',v_thread.status,'priority',v_thread.priority,'assignedTo',v_thread.assigned_to),
      jsonb_build_object('status',v_thread_after.status,'priority',v_thread_after.priority,'assignedTo',v_thread_after.assigned_to),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_collaboration_v1','handoffNotificationId',v_notification_id)
    );

    return jsonb_build_object(
      'id',v_thread_id,'threadId',v_thread_id,'status',v_status,'priority',v_priority,'assignedTo',v_assignee,
      'notificationId',v_notification_id
    );
  end if;

  raise exception 'OFFICE_COLLAB_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_office_collaboration_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_mutate_office_collaboration_v1(uuid,uuid,text,jsonb) to service_role;

comment on table public.office_message_mentions is 'Server-authoritative Digital Office mention evidence. No message body is copied here.';
comment on table public.office_user_notifications is 'Per-user Digital Office notification state containing references only; private content remains protected by thread access.';
comment on function public.admin_mutate_office_collaboration_v1(uuid,uuid,text,jsonb)
is 'Atomic Office collaboration mutations: internal messages with validated mentions, customer-thread handoff and self-only notification read state.';
