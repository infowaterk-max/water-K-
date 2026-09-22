-- Restore canonical commerce provider reference data after production baseline swap.
-- Idempotent reference-data repair: no tenant provider connection is enabled by this migration.

insert into public.commerce_provider_catalog(
  code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,payment_flow,is_available,sort_order
) values
  ('szamlazz','invoice','Számlázz.hu','api','szamlazz',null,null,true,10),
  ('bank_transfer','payment','Banki átutalás','manual','bank_transfer',null,'bank_transfer',true,10),
  ('cash_on_delivery','payment','Utánvét','manual','cash_on_delivery',null,'cash_on_delivery',true,20),
  ('kh_card','payment','K&H bankkártya','api','kh',null,'online_redirect',true,30),
  ('stripe','payment','Stripe','api','stripe',null,'online_redirect',true,40),
  ('simplepay','payment','SimplePay','api','simplepay',null,'online_redirect',true,50),
  ('barion','payment','Barion','api','barion',null,'online_redirect',true,60),
  ('custom_payment_api','payment','Egyedi fizetési API','custom','custom_payment_api',null,'online_redirect',true,900),
  ('pickup','shipping','Személyes átvétel','manual','pickup','pickup',null,true,10),
  ('foxpost','shipping','FOXPOST','api','foxpost','parcel_point',null,true,20),
  ('gls','shipping','GLS','api','gls','home_delivery',null,true,30),
  ('mpl','shipping','MPL','api','mpl','home_delivery',null,true,40),
  ('dpd','shipping','DPD','api','dpd','home_delivery',null,true,50),
  ('packeta','shipping','Packeta','api','packeta','parcel_point',null,true,60),
  ('expressone','shipping','Express One','api','expressone','home_delivery',null,true,70),
  ('custom_shipping_api','shipping','Egyedi szállítási API','custom','custom_shipping_api','home_delivery',null,true,900)
on conflict(code) do update set
  provider_type=excluded.provider_type,
  name=excluded.name,
  connection_mode=excluded.connection_mode,
  adapter_key=excluded.adapter_key,
  fulfillment_kind=excluded.fulfillment_kind,
  payment_flow=excluded.payment_flow,
  is_available=excluded.is_available,
  sort_order=excluded.sort_order;
