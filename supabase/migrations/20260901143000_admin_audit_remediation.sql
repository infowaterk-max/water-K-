-- Shoperation admin/workbench audit remediation: CMS, campaign attribution and provider catalog baseline.

alter table public.content_pages drop constraint if exists content_pages_kind_check;
alter table public.content_pages add constraint content_pages_kind_check check (kind in ('blog','landing','page'));

alter table public.marketing_campaigns
  add column if not exists channel text not null default 'email',
  add column if not exists budget_huf integer not null default 0,
  add column if not exists utm_campaign text,
  add column if not exists external_impressions integer not null default 0,
  add column if not exists external_clicks integer not null default 0;
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_segment_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_segment_check check (segment in ('repeat_30_89','winback_90_plus','at_risk_30_89','winback_90_179','lost_180_plus','high_value_at_risk','external'));
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_template_key_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_template_key_check check (template_key in ('repeat_30d','winback_90d','retention_risk_30d','reactivation_180d','vip_retention','external_attribution'));
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_channel_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_channel_check check (channel in ('email','facebook','instagram','tiktok','youtube','google','other'));
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_budget_huf_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_budget_huf_check check (budget_huf >= 0);
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_external_impressions_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_external_impressions_check check (external_impressions >= 0);
alter table public.marketing_campaigns drop constraint if exists marketing_campaigns_external_clicks_check;
alter table public.marketing_campaigns add constraint marketing_campaigns_external_clicks_check check (external_clicks >= 0);
create unique index if not exists marketing_campaigns_utm_campaign_unique on public.marketing_campaigns(lower(utm_campaign)) where utm_campaign is not null;

alter table public.orders
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists attributed_at timestamptz;
create index if not exists orders_utm_campaign_idx on public.orders(lower(utm_campaign)) where utm_campaign is not null;

insert into public.commerce_provider_catalog(code,provider_type,name,connection_mode,adapter_key,fulfillment_kind,payment_flow,is_available,sort_order) values
 ('bank_transfer','payment','Banki átutalás','manual','bank_transfer',null,'bank_transfer',true,10),
 ('cash_on_delivery','payment','Utánvét','manual','cash_on_delivery',null,'cash_on_delivery',true,20),
 ('kh_card','payment','K&H bankkártya','api','kh',null,'online_redirect',true,30),
 ('stripe','payment','Stripe','api','stripe',null,'online_redirect',true,40),
 ('simplepay','payment','SimplePay','api','simplepay',null,'online_redirect',true,50),
 ('barion','payment','Barion','api','barion',null,'online_redirect',true,60),
 ('pickup','shipping','Személyes átvétel','manual','pickup','pickup',null,true,10),
 ('foxpost','shipping','FOXPOST','api','foxpost','parcel_point',null,true,20),
 ('gls','shipping','GLS','api','gls','home_delivery',null,true,30),
 ('mpl','shipping','MPL','api','mpl','home_delivery',null,true,40),
 ('dpd','shipping','DPD','api','dpd','home_delivery',null,true,50),
 ('packeta','shipping','Packeta','api','packeta','parcel_point',null,true,60),
 ('expressone','shipping','Express One','api','expressone','home_delivery',null,true,70),
 ('szamlazz','invoice','Számlázz.hu','api','szamlazz',null,null,true,10)
on conflict(code) do update set provider_type=excluded.provider_type,name=excluded.name,connection_mode=excluded.connection_mode,adapter_key=excluded.adapter_key,fulfillment_kind=excluded.fulfillment_kind,payment_flow=excluded.payment_flow,is_available=excluded.is_available,sort_order=excluded.sort_order;
