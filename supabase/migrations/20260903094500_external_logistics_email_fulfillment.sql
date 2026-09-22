-- External logistics e-mail fulfillment.
-- Adds a tenant-configurable shipping mode where an external logistics partner receives
-- a transactional order e-mail instead of Shoperation calling a carrier API directly.

alter table public.integration_jobs
  drop constraint if exists integration_jobs_kind_check;

alter table public.integration_jobs
  add constraint integration_jobs_kind_check
  check (kind in (
    'payment_create',
    'payment_callback',
    'shipment_create',
    'invoice_create',
    'email_send',
    'logistics_email'
  ));

insert into public.commerce_provider_catalog(
  code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,payment_flow,is_available,sort_order
)
values(
  'external_logistics',
  'shipping',
  'Külső logisztikai partner',
  'manual',
  'external_logistics_email',
  'home_delivery',
  null,
  true,
  5
)
on conflict(code) do update set
  provider_type=excluded.provider_type,
  name=excluded.name,
  connection_mode=excluded.connection_mode,
  adapter_key=excluded.adapter_key,
  fulfillment_kind=excluded.fulfillment_kind,
  payment_flow=excluded.payment_flow,
  is_available=excluded.is_available,
  sort_order=excluded.sort_order;
