alter table public.webshop_instances
  add column if not exists storefront_config jsonb not null default '{}'::jsonb;

alter table public.webshop_instances
  add constraint webshop_instances_storefront_config_object_check
  check (jsonb_typeof(storefront_config) = 'object');
