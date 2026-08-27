-- V8 customer returns / refund case management.
-- Refund execution stays provider-specific; this migration tracks the operational case safely.

do $$ begin
  create type public.return_case_status as enum ('requested','approved','rejected','received','refund_pending','refunded','closed');
exception when duplicate_object then null; end $$;

create table if not exists public.return_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  reason text not null,
  customer_note text,
  status public.return_case_status not null default 'requested',
  refund_amount_gross_huf integer check (refund_amount_gross_huf is null or refund_amount_gross_huf >= 0),
  refund_reference text,
  admin_note text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  received_at timestamptz,
  refunded_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists return_cases_order_idx on public.return_cases(order_id, requested_at desc);
create index if not exists return_cases_user_idx on public.return_cases(user_id, requested_at desc);
create index if not exists return_cases_status_idx on public.return_cases(status, requested_at asc);

alter table public.return_cases enable row level security;

drop policy if exists "users can read own return cases" on public.return_cases;
create policy "users can read own return cases" on public.return_cases
  for select to authenticated using(auth.uid() = user_id);

drop policy if exists "users can create own return cases" on public.return_cases;
create policy "users can create own return cases" on public.return_cases
  for insert to authenticated with check(
    auth.uid() = user_id
    and exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

comment on table public.return_cases is 'Operational return/refund cases. Payment-provider refund execution is tracked by refund_reference and completion state.';
