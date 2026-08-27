-- V8 support thread race-condition hardening.
-- Enforces closed-thread protection inside the database transaction so API check/insert races cannot add messages after closure.

create or replace function public.guard_closed_support_thread()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_status public.support_ticket_status;
begin
  select status into v_status
  from public.support_tickets
  where id = new.ticket_id
  for update;

  if not found then
    raise exception 'Az ügy nem található.';
  end if;

  if v_status = 'closed' then
    raise exception 'A lezárt ügyhöz nem küldhető új üzenet.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_closed_support_thread() from public, anon, authenticated;

drop trigger if exists guard_closed_support_thread_trigger on public.support_ticket_messages;
create trigger guard_closed_support_thread_trigger
before insert on public.support_ticket_messages
for each row execute function public.guard_closed_support_thread();

comment on function public.guard_closed_support_thread() is 'Locks the parent support ticket and rejects message insertion when the thread is closed.';
