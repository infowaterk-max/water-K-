create table if not exists public.order_events(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  from_status public.order_status,
  to_status public.order_status,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_id_idx on public.order_events(order_id,created_at desc);

create table if not exists public.inventory_events(
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  change_quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists inventory_events_variant_id_idx on public.inventory_events(variant_id,created_at desc);

alter table public.order_events enable row level security;
alter table public.inventory_events enable row level security;
create policy "users can read permitted order events" on public.order_events for select to authenticated using(private.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "admins can read inventory events" on public.inventory_events for select to authenticated using(private.is_admin());

-- The production place_order() function is instrumented in the corresponding
-- database migration to insert order_created and inventory decrement events
-- inside the same transaction as the order and stock mutation.
