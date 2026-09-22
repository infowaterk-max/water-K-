-- Server-side catalog/admin reads use the service-role client.
-- Keep the minimum catalog read set explicit across staging and customer baselines.
grant select on table public.products to service_role;
grant select on table public.product_variants to service_role;
grant select on table public.webshop_sales_channels to service_role;
grant select on table public.product_channel_settings to service_role;
grant select on table public.product_media to service_role;
grant select on table public.product_media_presentations to service_role;
