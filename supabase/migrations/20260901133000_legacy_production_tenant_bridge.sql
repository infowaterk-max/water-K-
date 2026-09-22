-- One-time compatibility bridge for legacy single-store databases.
-- Fresh/neutral installations remain empty; only an existing legacy commerce dataset
-- with zero webshop instances receives the deterministic migration tenant.

do $$
declare
  v_instance_count integer;
  v_legacy_rows bigint;
begin
  if to_regclass('public.webshop_instances') is null then
    raise exception 'webshop_instances must exist before legacy tenant bootstrap';
  end if;

  select count(*) into v_instance_count from public.webshop_instances;
  select
    (select count(*) from public.products)
    + (select count(*) from public.product_variants)
    + (select count(*) from public.orders)
    + (select count(*) from public.coupons)
  into v_legacy_rows;

  if v_instance_count = 0 and v_legacy_rows > 0 then
    insert into public.webshop_instances(slug,name,subscription_plan,status)
    values('legacy-main','Migrált webshop','alap','active')
    on conflict(slug) do nothing;
  end if;
end $$;

-- Fail closed if a legacy dataset still has no unique runtime tenant. The following
-- multi_tenant_core_scope migration relies on exactly one active/pilot instance to
-- backfill products, variants, orders and their child records safely.
do $$
declare
  v_legacy_rows bigint;
  v_runtime_instances integer;
begin
  select
    (select count(*) from public.products)
    + (select count(*) from public.product_variants)
    + (select count(*) from public.orders)
    + (select count(*) from public.coupons)
  into v_legacy_rows;

  select count(*) into v_runtime_instances
  from public.webshop_instances
  where status in ('pilot','active');

  if v_legacy_rows > 0 and v_runtime_instances <> 1 then
    raise exception 'Legacy tenant bootstrap requires exactly one active/pilot webshop instance; found %.',v_runtime_instances;
  end if;
end $$;
