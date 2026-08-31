alter table public.commerce_provider_catalog
  drop constraint if exists commerce_provider_catalog_provider_type_check;

alter table public.commerce_provider_catalog
  add constraint commerce_provider_catalog_provider_type_check
  check (provider_type = any (array['payment'::text,'shipping'::text,'invoice'::text]));

insert into public.commerce_provider_catalog(
  code, provider_type, name, connection_mode, adapter_key,
  fulfillment_kind, payment_flow, is_available, sort_order
)
values(
  'szamlazz', 'invoice', 'Számlázz.hu', 'api', 'szamlazz',
  null, null, true, 10
)
on conflict (code) do update set
  provider_type=excluded.provider_type,
  name=excluded.name,
  connection_mode=excluded.connection_mode,
  adapter_key=excluded.adapter_key,
  fulfillment_kind=null,
  payment_flow=null,
  is_available=true,
  sort_order=excluded.sort_order;