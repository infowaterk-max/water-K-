create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create type public.customer_type as enum ('retail', 'company', 'reseller');
create type public.order_status as enum (
  'draft',
  'pending_payment',
  'pending_transfer',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
  'refunded'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  customer_type public.customer_type not null default 'retail',
  full_name text,
  company_name text,
  tax_number text,
  phone text,
  approved_reseller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  size_label text not null,
  gross_price integer not null check (gross_price >= 0),
  net_price integer not null check (net_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  audience public.customer_type[] not null default array['retail'::public.customer_type, 'company'::public.customer_type],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid references public.profiles(id) on delete set null,
  status public.order_status not null default 'draft',
  customer_type public.customer_type not null default 'retail',
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  company_name text,
  tax_number text,
  billing_address text not null,
  shipping_address text not null,
  total_gross integer not null default 0 check (total_gross >= 0),
  shipping_method text not null,
  parcel_point_id text,
  payment_method text not null,
  external_payment_id text,
  tracking_number text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_gross integer not null check (unit_gross >= 0),
  line_gross integer not null check (line_gross >= 0)
);

create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);
create index order_items_order_id_idx on public.order_items(order_id);

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public, anon, authenticated;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger products_touch_updated_at
before update on public.products
for each row execute function private.touch_updated_at();

create trigger orders_touch_updated_at
before update on public.orders
for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public can read active products"
on public.products for select
to anon, authenticated
using (active = true);

create policy "users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users can read own orders"
on public.orders for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can read own order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.user_id = (select auth.uid())
  )
);
