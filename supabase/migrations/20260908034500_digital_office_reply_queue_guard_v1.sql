-- Hard queue boundary for Digital Office replies.
-- Any communication job carrying an officeThreadId must have a dedicated active Office mailbox and private route
-- before it can enter the queue, including legacy server call paths.

create or replace function private.enforce_office_reply_queue_mailbox_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_thread_id uuid;
  v_thread public.office_threads%rowtype;
  v_mailbox_ok boolean:=false;
  v_route_ok boolean:=false;
begin
  if new.template_key<>'support_reply' or not (coalesce(new.payload,'{}'::jsonb) ? 'officeThreadId') then
    return new;
  end if;

  begin
    v_thread_id:=(new.payload->>'officeThreadId')::uuid;
  exception when others then
    raise exception 'OFFICE_REPLY_THREAD_REQUIRED';
  end;

  select * into v_thread
  from public.office_threads
  where id=v_thread_id and instance_id=new.instance_id and conversation_type='customer';
  if not found then raise exception 'OFFICE_REPLY_THREAD_REQUIRED'; end if;
  if v_thread.mailbox_key is null then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'; end if;

  select exists(
    select 1 from public.office_mailboxes m
    where m.instance_id=new.instance_id
      and m.mailbox_key=v_thread.mailbox_key
      and m.is_active=true
  ) into v_mailbox_ok;
  if not v_mailbox_ok then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'; end if;

  select exists(
    select 1 from public.office_thread_email_routes r
    where r.instance_id=new.instance_id and r.thread_id=v_thread_id
  ) into v_route_ok;
  if not v_route_ok then raise exception 'OFFICE_EMAIL_ROUTE_MISSING'; end if;

  return new;
end;
$$;

revoke all on function private.enforce_office_reply_queue_mailbox_v1() from public,anon,authenticated;

drop trigger if exists communication_jobs_office_reply_mailbox_guard on public.communication_jobs;
create trigger communication_jobs_office_reply_mailbox_guard
before insert on public.communication_jobs
for each row execute function private.enforce_office_reply_queue_mailbox_v1();
