-- Shoperation platform default: new webshop instances start provider-neutral.
-- Existing reference-shop rows are preserved; their provider connections remain explicit data.

alter table public.webshop_instance_commerce_settings
  alter column enabled_shipping_methods set default array[]::text[],
  alter column enabled_payment_methods set default array[]::text[],
  alter column free_shipping_threshold_huf set default 0;

alter table public.webshop_instance_commerce_settings
  drop constraint if exists webshop_instance_shipping_methods_check;
alter table public.webshop_instance_commerce_settings
  drop constraint if exists webshop_instance_payment_methods_check;

alter table public.webshop_instance_commerce_settings
  add constraint webshop_instance_shipping_methods_check
  check (enabled_shipping_methods <@ array['foxpost','gls','mpl','dpd','packeta','expressone','pickup','custom_shipping_api']::text[]);

alter table public.webshop_instance_commerce_settings
  add constraint webshop_instance_payment_methods_check
  check (enabled_payment_methods <@ array['kh_card','simplepay','stripe','barion','bank_transfer','cash_on_delivery','custom_payment_api']::text[]);
