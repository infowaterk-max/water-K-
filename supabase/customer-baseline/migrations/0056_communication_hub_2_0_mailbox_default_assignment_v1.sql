-- Shoperation-Office-Source: 20260910070100_communication_hub_2_0_mailbox_default_assignment_v1.sql sha256=b414d0a822f2e1226ee074c265b0588ddd772d23a7a64dd5e76ecfa8dd9a03d0
-- Roadmap Block 9 — mailbox responsibility drives only default assignment.
-- Manual assignees are never overwritten. No mailbox activation is performed.

create or replace function private.office_customer_mailbox_default_assignee_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_responsible uuid;
begin
  if new.conversation_type<>'customer' or new.assigned_to is not null or new.mailbox_key is null then
    return new;
  end if;

  select m.responsible_user_id into v_responsible
  from public.office_mailboxes m
  where m.instance_id=new.instance_id
    and m.mailbox_key=new.mailbox_key
    and m.is_active=true;

  if v_responsible is not null and private.office_active_member_v1(new.instance_id,v_responsible) then
    new.assigned_to:=v_responsible;
  end if;
  return new;
end;
$$;

revoke all on function private.office_customer_mailbox_default_assignee_v1() from public,anon,authenticated;

drop trigger if exists office_customer_mailbox_default_assignee_v1 on public.office_threads;
create trigger office_customer_mailbox_default_assignee_v1
before insert or update of mailbox_key on public.office_threads
for each row execute function private.office_customer_mailbox_default_assignee_v1();

comment on function private.office_customer_mailbox_default_assignee_v1()
is 'Block 9 default routing: assigns an unowned customer thread to the active responsible user of its active Office mailbox. Existing/manual assignees are never overwritten.';
