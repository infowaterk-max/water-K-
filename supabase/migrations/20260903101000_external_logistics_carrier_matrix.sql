-- External logistics carrier matrix.
-- Adds common customer-facing carrier choices that are fulfilled by an external
-- logistics partner via e-mail rather than direct carrier API integration.

insert into public.commerce_provider_catalog(
  code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,payment_flow,is_available,sort_order
) values
  ('external_gls_home','shipping','GLS Házhozszállítás','manual','external_logistics_email','home_delivery',null,true,11),
  ('external_mpl_home','shipping','MPL Házhozszállítás','manual','external_logistics_email','home_delivery',null,true,12),
  ('external_mpl_automata','shipping','Posta / Csomagautomata','manual','external_logistics_email','parcel_point',null,true,13),
  ('external_mpl_postapont','shipping','Postapontok (COOP/MOL)','manual','external_logistics_email','parcel_point',null,true,14),
  ('external_foxpost','shipping','FOXPOST','manual','external_logistics_email','parcel_point',null,true,15),
  ('external_gls_parcel','shipping','GLS CsomagPont / Automata','manual','external_logistics_email','parcel_point',null,true,16)
on conflict(code) do update set
  provider_type=excluded.provider_type,
  name=excluded.name,
  connection_mode=excluded.connection_mode,
  adapter_key=excluded.adapter_key,
  fulfillment_kind=excluded.fulfillment_kind,
  payment_flow=excluded.payment_flow,
  is_available=excluded.is_available,
  sort_order=excluded.sort_order;
