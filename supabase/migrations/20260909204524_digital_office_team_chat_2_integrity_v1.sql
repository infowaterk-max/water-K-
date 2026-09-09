-- Team Chat 2 table-boundary integrity.
-- RPC validation remains the primary mutation path, but service-role mistakes must also fail closed.

create or replace function private.enforce_office_message_mention_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_message public.office_messages%rowtype;
  v_thread public.office_threads%rowtype;
begin
  select * into v_message
  from public.office_messages
  where id=new.message_id and thread_id=new.thread_id and instance_id=new.instance_id;
  if not found or v_message.kind<>'internal' or v_message.author_id is distinct from new.mentioned_by then
    raise exception 'OFFICE_MENTION_MESSAGE_INTEGRITY_INVALID';
  end if;

  select * into v_thread
  from public.office_threads
  where id=new.thread_id and instance_id=new.instance_id;
  if not found or v_thread.conversation_type not in ('internal_private','internal_group') then
    raise exception 'OFFICE_MENTION_THREAD_INTEGRITY_INVALID';
  end if;

  if new.mentioned_user_id=new.mentioned_by
     or not public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.mentioned_user_id) then
    raise exception 'OFFICE_MENTION_PARTICIPANT_REQUIRED';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_office_message_object_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_message public.office_messages%rowtype;
  v_thread public.office_threads%rowtype;
begin
  select * into v_message
  from public.office_messages
  where id=new.message_id and thread_id=new.thread_id and instance_id=new.instance_id;
  if not found or v_message.kind<>'internal' or v_message.author_id is distinct from new.created_by then
    raise exception 'OFFICE_OBJECT_MESSAGE_INTEGRITY_INVALID';
  end if;

  select * into v_thread
  from public.office_threads
  where id=new.thread_id and instance_id=new.instance_id;
  if not found or v_thread.conversation_type not in ('internal_private','internal_group') then
    raise exception 'OFFICE_OBJECT_THREAD_INTEGRITY_INVALID';
  end if;

  if not public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.created_by) then
    raise exception 'OFFICE_OBJECT_AUTHOR_ACCESS_REQUIRED';
  end if;
  if not public.can_manage_support(new.instance_id,new.created_by) then
    raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED';
  end if;
  if not private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id) then
    raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND';
  end if;
  return new;
end;
$$;

drop trigger if exists office_message_mentions_integrity on public.office_message_mentions;
create trigger office_message_mentions_integrity
before insert or update of message_id,thread_id,instance_id,mentioned_user_id,mentioned_by
on public.office_message_mentions
for each row execute function private.enforce_office_message_mention_integrity_v1();

drop trigger if exists office_message_object_links_integrity on public.office_message_object_links;
create trigger office_message_object_links_integrity
before insert or update of message_id,thread_id,instance_id,object_type,object_id,created_by
on public.office_message_object_links
for each row execute function private.enforce_office_message_object_integrity_v1();

revoke all on function private.enforce_office_message_mention_integrity_v1() from public,anon,authenticated;
revoke all on function private.enforce_office_message_object_integrity_v1() from public,anon,authenticated;

comment on function private.enforce_office_message_mention_integrity_v1()
is 'Fails closed unless an internal-message mention targets an active participant who can read the same private thread.';
comment on function private.enforce_office_message_object_integrity_v1()
is 'Fails closed unless an internal-message object card is authored by the message author, the author still has support business-object authority, and the card references an authoritative object in the same webshop instance.';
