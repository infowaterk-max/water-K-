create table if not exists public.commerce_provider_catalog (
  code text primary key,
  provider_type text not null check (provider_type in ('payment','shipping')),
  name text not null,
  connection_mode text not null default 'api' check (connection_mode in ('builtin','api','manual','custom')),
  adapter_key text not null,
  fulfillment_kind text null check (fulfillment_kind in ('parcel_point','home_delivery','pickup')),
  is_available boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
create table if not exists public.webshop_instance_provider_connections (
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  provider_code text not null references public.commerce_provider_catalog(code) on delete restrict,
  enabled boolean not null default false,
  display_label text,
  fee_huf integer check (fee_huf is null or fee_huf >= 0),
  configuration jsonb not null default '{}'::jsonb,
  connection_status text not null default 'not_configured' check (connection_status in ('not_configured','configured','active','error')),
  updated_at timestamptz not null default now(),
  primary key(instance_id,provider_code)
);
alter table public.commerce_provider_catalog enable row level security;
alter table public.webshop_instance_provider_connections enable row level security;
revoke all on public.commerce_provider_catalog from public,anon,authenticated;
revoke all on public.webshop_instance_provider_connections from public,anon,authenticated;
grant select,insert,update,delete on public.commerce_provider_catalog to service_role;
grant select,insert,update,delete on public.webshop_instance_provider_connections to service_role;
insert into public.commerce_provider_catalog(code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,sort_order) values
('bank_transfer','payment','Banki átutalás','manual','bank_transfer',null,10),('kh_card','payment','K&H bankkártya','api','kh',null,20),('simplepay','payment','SimplePay','api','simplepay',null,30),('stripe','payment','Stripe','api','stripe',null,40),('barion','payment','Barion','api','barion',null,50),('cash_on_delivery','payment','Utánvét','manual','cash_on_delivery',null,60),('custom_payment_api','payment','Egyedi fizetési API','custom','custom_payment_api',null,900),('foxpost','shipping','Foxpost','api','foxpost','parcel_point',10),('gls','shipping','GLS','api','gls','home_delivery',20),('mpl','shipping','MPL','api','mpl','home_delivery',30),('dpd','shipping','DPD','api','dpd','home_delivery',40),('packeta','shipping','Packeta','api','packeta','parcel_point',50),('expressone','shipping','Express One','api','expressone','home_delivery',60),('pickup','shipping','Személyes átvétel','manual','pickup','pickup',70),('custom_shipping_api','shipping','Egyedi szállítási API','custom','custom_shipping_api','home_delivery',900)
on conflict(code) do update set name=excluded.name,connection_mode=excluded.connection_mode,adapter_key=excluded.adapter_key,fulfillment_kind=excluded.fulfillment_kind,sort_order=excluded.sort_order;
