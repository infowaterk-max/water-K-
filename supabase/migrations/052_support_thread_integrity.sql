create or replace function public.initialize_support_ticket_thread()
returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.message is not null and char_length(trim(new.message))>0 then
    insert into public.support_ticket_messages(ticket_id,author_user_id,author_role,message,created_at)
    values(new.id,new.user_id,'customer',new.message,new.created_at)
    on conflict do nothing;
  end if;
  return new;
end;$$;

revoke all on function public.initialize_support_ticket_thread() from public,anon,authenticated;
drop trigger if exists initialize_support_ticket_thread_trigger on public.support_tickets;
create trigger initialize_support_ticket_thread_trigger
after insert on public.support_tickets
for each row execute function public.initialize_support_ticket_thread();

create or replace function public.sync_support_ticket_from_message()
returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.author_role='customer' then
    update public.support_tickets
      set status='open',updated_at=greatest(updated_at,new.created_at)
      where id=new.ticket_id and status<>'closed';
  elsif new.author_role='admin' then
    update public.support_tickets
      set status='waiting_customer',updated_at=greatest(updated_at,new.created_at)
      where id=new.ticket_id and status<>'closed';
  else
    update public.support_tickets set updated_at=greatest(updated_at,new.created_at) where id=new.ticket_id;
  end if;
  return new;
end;$$;

revoke all on function public.sync_support_ticket_from_message() from public,anon,authenticated;
drop trigger if exists sync_support_ticket_from_message_trigger on public.support_ticket_messages;
create trigger sync_support_ticket_from_message_trigger
after insert on public.support_ticket_messages
for each row execute function public.sync_support_ticket_from_message();
