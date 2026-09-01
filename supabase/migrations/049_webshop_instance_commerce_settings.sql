create table if not exists public.webshop_instance_commerce_settings (
  instance_id uuid primary key references public.webshop_instances(id) on delete cascade,
  enabled_shipping_methods text[] not null default array['foxpost','gls','mpl','pickup']::text[],
  enabled_payment_methods text[] not null default array['kh_card','bank_transfer']::text[],
  free_shipping_threshold_huf integer not null default 50000 check (free_shipping_threshold_huf >= 0),
  foxpost_fee_huf integer not null default 1490 check (foxpost_fee_huf >= 0),
  gls_fee_huf integer not null default 2190 check (gls_fee_huf >= 0),
  mpl_fee_huf integer not null default 1990 check (mpl_fee_huf >= 0),
  pickup_fee_huf integer not null default 0 check (pickup_fee_huf >= 0),
  updated_at timestamptz not null default now(),
  constraint webshop_instance_shipping_methods_check check (enabled_shipping_methods <@ array['foxpost','gls','mpl','pickup']::text[] and cardinality(enabled_shipping_methods) > 0),
  constraint webshop_instance_payment_methods_check check (enabled_payment_methods <@ array['kh_card','bank_transfer']::text[] and cardinality(enabled_payment_methods) > 0)
);

alter table public.webshop_instance_commerce_settings enable row level security;
revoke all on table public.webshop_instance_commerce_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.webshop_instance_commerce_settings to service_role;
