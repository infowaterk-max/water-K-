create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

do $$ begin create type public.customer_role as enum ('customer','reseller','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('draft','pending','paid','processing','shipped','completed','cancelled','refunded'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  tax_number text,
  role public.customer_role not null default 'customer',
  reseller_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products(
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants(
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique not null,
  label text not null,
  net_price_huf integer not null check(net_price_huf>=0),
  gross_price_huf integer not null check(gross_price_huf>=0),
  stock_quantity integer not null default 0 check(stock_quantity>=0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders(
  id uuid primary key default gen_random_uuid(), customer_id uuid references auth.users(id) on delete set null,
  order_number text unique not null, status public.order_status not null default 'pending', customer_email text not null,
  billing_name text not null, billing_company text, billing_tax_number text, billing_postcode text, billing_city text, billing_address text,
  shipping_name text, shipping_postcode text, shipping_city text, shipping_address text,
  subtotal_gross_huf integer not null default 0, shipping_gross_huf integer not null default 0, total_gross_huf integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.order_items(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null, product_name text not null, variant_label text not null, sku text not null,
  quantity integer not null check(quantity>0), unit_gross_huf integer not null check(unit_gross_huf>=0), line_total_gross_huf integer not null check(line_total_gross_huf>=0)
);

create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function private.is_admin() from public,anon,authenticated;

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,email) values(new.id,new.email) on conflict(id) do nothing; return new; end; $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security; alter table public.products enable row level security; alter table public.product_variants enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security;

create policy "anonymous can read active products" on public.products for select to anon using(active=true);
create policy "authenticated can read products" on public.products for select to authenticated using(active=true or private.is_admin());
create policy "admins can update products" on public.products for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "anonymous can read active variants" on public.product_variants for select to anon using(active=true and exists(select 1 from public.products p where p.id=product_id and p.active=true));
create policy "authenticated can read variants" on public.product_variants for select to authenticated using((active=true and exists(select 1 from public.products p where p.id=product_id and p.active=true)) or private.is_admin());
create policy "admins can update variants" on public.product_variants for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "authenticated can read permitted profiles" on public.profiles for select to authenticated using(auth.uid()=id or private.is_admin());
create policy "users can update own profile" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy "authenticated can read permitted orders" on public.orders for select to authenticated using(auth.uid()=customer_id or private.is_admin());
create policy "admins can update orders" on public.orders for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "authenticated can read permitted order items" on public.order_items for select to authenticated using(private.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
