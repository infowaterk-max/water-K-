-- Team Chat retention lifecycle v1.
-- Product contract: internal chat content 12 months, archive after 90 days inactivity,
-- Team Chat audit evidence 24 months. Audit never copies message body.
-- Secure Attachments 2.1 is not production-active. Messages with attachment metadata
-- remain fail-closed until private storage objects can be removed first.

alter table public.office_threads add column if not exists archived_at timestamptz;

create index if not exists office_threads_internal_retention_idx
  on public.office_threads(instance_id,updated_at,id)
  where conversation_type in ('internal_private','internal_group') and archived_at is null;

create index if not exists office_messages_internal_retention_idx
  on public.office_messages(instance_id,created_at,thread_id,id)
  where kind='internal';

create or replace function private.enforce_archived_office_internal_message_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_archived_at timestamptz;
begin
  if new.kind<>'internal' then return new; end if;
  select t.archived_at into v_archived_at from public.office_threads t
  where t.id=new.thread_id and t.instance_id=new.instance_id;
  if not found then raise exception 'OFFICE_INTERNAL_THREAD_NOT_FOUND'; end if;
  if v_archived_at is not null then raise exception 'OFFICE_INTERNAL_THREAD_ARCHIVED'; end if;
  return new;
end;
$$;

drop trigger if exists office_internal_message_archive_guard on public.office_messages;
create trigger office_internal_message_archive_guard before insert on public.office_messages
for each row execute function private.enforce_archived_office_internal_message_v1();

create or replace function private.enforce_archived_office_participant_mutation_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_archived_at timestamptz; v_significant boolean;
begin
  v_significant:=tg_op='INSERT'
    or old.participant_role is distinct from new.participant_role
    or old.joined_at is distinct from new.joined_at
    or old.left_at is distinct from new.left_at
    or old.added_by is distinct from new.added_by;
  if not v_significant then return new; end if;
  select t.archived_at into v_archived_at from public.office_threads t
  where t.id=new.thread_id and t.instance_id=new.instance_id
    and t.conversation_type in ('internal_private','internal_group');
  if found and v_archived_at is not null then raise exception 'OFFICE_INTERNAL_THREAD_ARCHIVED'; end if;
  return new;
end;
$$;

drop trigger if exists office_internal_participant_archive_guard on public.office_thread_participants;
create trigger office_internal_participant_archive_guard
before insert or update of participant_role,joined_at,left_at,added_by on public.office_thread_participants
for each row execute function private.enforce_archived_office_participant_mutation_v1();

create or replace function private.touch_office_team_chat_participant_activity_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_significant boolean;
begin
  v_significant:=tg_op='INSERT'
    or old.participant_role is distinct from new.participant_role
    or old.joined_at is distinct from new.joined_at
    or old.left_at is distinct from new.left_at
    or old.added_by is distinct from new.added_by;
  if not v_significant then return new; end if;
  update public.office_threads t set updated_at=now()
  where t.id=new.thread_id and t.instance_id=new.instance_id
    and t.conversation_type in ('internal_private','internal_group') and t.archived_at is null;
  return new;
end;
$$;

drop trigger if exists office_team_chat_participant_activity_touch on public.office_thread_participants;
create trigger office_team_chat_participant_activity_touch
after insert or update of participant_role,joined_at,left_at,added_by on public.office_thread_participants
for each row execute function private.touch_office_team_chat_participant_activity_v1();

create or replace function public.admin_run_office_team_chat_retention_v1(
  p_instance_id uuid,
  p_now timestamptz default now()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_archived integer:=0; v_messages_deleted integer:=0; v_audit_deleted integer:=0;
begin
  if p_instance_id is null or p_now is null then raise exception 'OFFICE_RETENTION_IDENTITY_REQUIRED'; end if;
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id) then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  update public.office_threads t set archived_at=p_now
  where t.instance_id=p_instance_id
    and t.conversation_type in ('internal_private','internal_group')
    and t.archived_at is null
    and t.updated_at<=p_now-interval '90 days';
  get diagnostics v_archived=row_count;

  delete from public.office_messages m using public.office_threads t
  where m.instance_id=p_instance_id and t.instance_id=p_instance_id and t.id=m.thread_id
    and t.conversation_type in ('internal_private','internal_group') and m.kind='internal'
    and m.created_at<=p_now-interval '12 months'
    and not exists(select 1 from public.office_message_attachments a where a.instance_id=p_instance_id and a.message_id=m.id);
  get diagnostics v_messages_deleted=row_count;

  delete from public.admin_audit_log a
  where a.instance_id=p_instance_id and a.created_at<=p_now-interval '24 months'
    and a.action in (
      'office.private_thread_created_v2','office.private_message_added_v2',
      'office.private_participant_added','office.private_participant_removed','office.private_owner_transferred'
    );
  get diagnostics v_audit_deleted=row_count;

  return jsonb_build_object('instanceId',p_instance_id,'checkedAt',p_now,
    'threadsArchived',v_archived,'messagesDeleted',v_messages_deleted,'auditDeleted',v_audit_deleted);
end;
$$;

revoke all on function private.enforce_archived_office_internal_message_v1() from public,anon,authenticated;
revoke all on function private.enforce_archived_office_participant_mutation_v1() from public,anon,authenticated;
revoke all on function private.touch_office_team_chat_participant_activity_v1() from public,anon,authenticated;
revoke all on function public.admin_run_office_team_chat_retention_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_run_office_team_chat_retention_v1(uuid,timestamptz) to service_role;

comment on column public.office_threads.archived_at is 'Internal Team Chat archive marker after 90 days inactivity.';
comment on function public.admin_run_office_team_chat_retention_v1(uuid,timestamptz) is 'Archives Team Chat after 90 days, removes text-only internal messages after 12 months, and only Team Chat audit evidence after 24 months; message body is never copied to audit.';
