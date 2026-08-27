-- V8 procurement workflow: suppliers, purchase plans/orders and cash timing.
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  payment_terms_days integer not null default 8 check (payment_terms_days between 0 and 365),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_variants add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','approved','ordered','partially_received','received','cancelled')),
  ordered_at timestamptz,
  expected_at date,
  payment_due_at date,
  net_total_huf numeric(14,2) not null default 0 check (net_total_huf >= 0),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  received_quantity integer not null default 0 check (received_quantity >= 0),
  unit_cost_net_huf numeric(12,2) not null check (unit_cost_net_huf >= 0),
  line_net_huf numeric(14,2) generated always as (quantity * unit_cost_net_huf) stored,
  created_at timestamptz not null default now()
);

create index if not exists purchase_orders_status_due_idx on public.purchase_orders(status,payment_due_at);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items(purchase_order_id);
create index if not exists product_variants_supplier_idx on public.product_variants(supplier_id);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

comment on table public.purchase_orders is 'Admin-controlled procurement commitments used for replenishment workflow and cash planning.';
comment on table public.purchase_order_items is 'Immutable planned procurement quantities and unit cost snapshots for each purchase order.';
