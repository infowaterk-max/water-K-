-- V8 item-level return scope for partial returns and safer refund review.
create table if not exists public.return_case_items (
  id uuid primary key default gen_random_uuid(),
  return_case_id uuid not null references public.return_cases(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check(quantity > 0),
  created_at timestamptz not null default now(),
  unique(return_case_id,order_item_id)
);
create index if not exists return_case_items_case_idx on public.return_case_items(return_case_id);
create index if not exists return_case_items_order_item_idx on public.return_case_items(order_item_id);
alter table public.return_case_items enable row level security;
drop policy if exists "users can read own return items" on public.return_case_items;
create policy "users can read own return items" on public.return_case_items for select to authenticated using(exists(select 1 from public.return_cases r where r.id=return_case_id and r.user_id=auth.uid()));
comment on table public.return_case_items is 'Exact order-item quantities included in a return/refund case.';
