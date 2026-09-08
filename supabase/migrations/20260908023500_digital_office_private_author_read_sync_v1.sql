-- Private Office author read-state invariant.
-- An author must never make their own newly inserted private message unread for themselves.

create or replace function private.sync_private_office_author_read_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.author_id is null or new.kind<>'internal' then return new; end if;
  if not exists(
    select 1
    from public.office_threads t
    where t.id=new.thread_id
      and t.instance_id=new.instance_id
      and t.conversation_type in ('internal_private','internal_group')
  ) then return new; end if;

  update public.office_thread_participants p
  set last_read_at=case
        when p.last_read_at is null or p.last_read_at<new.created_at then new.created_at
        else p.last_read_at
      end,
      updated_at=now()
  where p.instance_id=new.instance_id
    and p.thread_id=new.thread_id
    and p.user_id=new.author_id
    and p.left_at is null;
  if not found then raise exception 'OFFICE_PRIVATE_AUTHOR_PARTICIPANT_REQUIRED'; end if;
  return new;
end;
$$;

drop trigger if exists office_messages_private_author_read_sync on public.office_messages;
create trigger office_messages_private_author_read_sync
after insert on public.office_messages
for each row execute function private.sync_private_office_author_read_v1();

revoke all on function private.sync_private_office_author_read_v1() from public,anon,authenticated;
