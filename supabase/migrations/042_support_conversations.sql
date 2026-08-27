-- V8 threaded customer-service conversations.
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_role text not null check(author_role in ('customer','admin','system')),
  message text not null check(char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages(ticket_id,created_at asc);
alter table public.support_ticket_messages enable row level security;
drop policy if exists "users can read own support messages" on public.support_ticket_messages;
create policy "users can read own support messages" on public.support_ticket_messages for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
drop policy if exists "users can add own support messages" on public.support_ticket_messages;
create policy "users can add own support messages" on public.support_ticket_messages for insert to authenticated with check(author_role='customer' and author_user_id=auth.uid() and exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid() and t.status not in ('closed')));
insert into public.support_ticket_messages(ticket_id,author_user_id,author_role,message,created_at)
select t.id,t.user_id,'customer',t.message,t.created_at from public.support_tickets t
where not exists(select 1 from public.support_ticket_messages m where m.ticket_id=t.id);
comment on table public.support_ticket_messages is 'Chronological customer/admin support conversation messages.';
