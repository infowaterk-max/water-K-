-- V8 first-party customer support inbox for pre-sale and post-sale questions.

do $$ begin
  create type public.support_ticket_status as enum ('open','in_progress','waiting_customer','resolved','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_ticket_category as enum ('product','order','shipping','invoice','reseller','return','other');
exception when duplicate_object then null; end $$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  email text not null,
  name text,
  category public.support_ticket_category not null default 'other',
  subject text not null,
  message text not null,
  status public.support_ticket_status not null default 'open',
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

create index if not exists support_tickets_status_idx on public.support_tickets(status, priority, created_at asc);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_email_idx on public.support_tickets(lower(email), created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "users can read own support tickets" on public.support_tickets;
create policy "users can read own support tickets" on public.support_tickets
  for select to authenticated using(auth.uid() = user_id);

comment on table public.support_tickets is 'First-party customer service ticket inbox. Public creation goes through the server API; authenticated users can read their own tickets.';
