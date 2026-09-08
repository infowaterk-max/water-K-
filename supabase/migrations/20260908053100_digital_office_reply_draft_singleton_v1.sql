-- Digital Office reply-draft singleton guard.
-- One author may have at most one reply draft per customer thread. Concurrent first autosaves are serialized
-- so a second tab receives OFFICE_DRAFT_CONFLICT instead of silently creating a second competing draft.

create or replace function private.enforce_single_office_reply_draft_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.draft_type<>'reply' or new.thread_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      new.instance_id::text||':'||new.author_user_id::text||':'||new.thread_id::text,
      0
    )
  );

  if exists(
    select 1
    from public.office_drafts d
    where d.instance_id=new.instance_id
      and d.author_user_id=new.author_user_id
      and d.thread_id=new.thread_id
      and d.draft_type='reply'
      and d.id<>new.id
  ) then
    raise exception 'OFFICE_DRAFT_CONFLICT';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_single_office_reply_draft_v1() from public,anon,authenticated;

drop trigger if exists office_drafts_single_reply_guard on public.office_drafts;
create trigger office_drafts_single_reply_guard
before insert or update of instance_id,author_user_id,thread_id,draft_type on public.office_drafts
for each row execute function private.enforce_single_office_reply_draft_v1();

create unique index if not exists office_drafts_reply_author_thread_uidx
  on public.office_drafts(instance_id,author_user_id,thread_id)
  where draft_type='reply' and thread_id is not null;

comment on function private.enforce_single_office_reply_draft_v1()
is 'Serializes first reply-draft creation per tenant/author/thread and returns OFFICE_DRAFT_CONFLICT instead of creating competing drafts.';
