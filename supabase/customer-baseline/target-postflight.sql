-- Shoperation fresh-install target postflight.
-- Read-only proof: run after applying the reviewed Shoperation 1.0 baseline
-- and the neutral customer-baseline seed, before provisioning any customer data.

do $$
declare
  missing text[] := array[]::text[];
  profile_default text;
  instance_default text;
  legacy_checkout_count integer;
  current_checkout_count integer;
  public_policy_count integer;
  customer_rows bigint;
begin
  if to_regclass('public.webshop_instances') is null then missing := array_append(missing, 'public.webshop_instances'); end if;
  if to_regclass('public.profiles') is null then missing := array_append(missing, 'public.profiles'); end if;
  if to_regclass('public.products') is null then missing := array_append(missing, 'public.products'); end if;
  if to_regclass('public.product_variants') is null then missing := array_append(missing, 'public.product_variants'); end if;
  if to_regclass('public.orders') is null then missing := array_append(missing, 'public.orders'); end if;
  if to_regclass('public.commerce_provider_catalog') is null then missing := array_append(missing, 'public.commerce_provider_catalog'); end if;
  if to_regclass('public.webshop_instance_commerce_settings') is null then missing := array_append(missing, 'public.webshop_instance_commerce_settings'); end if;

  if cardinality(missing) > 0 then
    raise exception 'Fresh-install baseline is incomplete. Missing core objects: %', array_to_string(missing, ', ');
  end if;

  select pg_get_expr(d.adbin, d.adrelid)
    into profile_default
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'subscription_plan' and not a.attisdropped;

  select pg_get_expr(d.adbin, d.adrelid)
    into instance_default
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relname = 'webshop_instances' and a.attname = 'subscription_plan' and not a.attisdropped;

  if profile_default is null or profile_default not ilike '%alap%' then
    raise exception 'profiles.subscription_plan must fail closed to Alap; current default: %', coalesce(profile_default, '<none>');
  end if;

  if instance_default is null or instance_default not ilike '%alap%' then
    raise exception 'webshop_instances.subscription_plan must fail closed to Alap; current default: %', coalesce(instance_default, '<none>');
  end if;

  select count(*) into legacy_checkout_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'place_order';

  if legacy_checkout_count <> 0 then
    raise exception 'Obsolete public.place_order overloads are present: %', legacy_checkout_count;
  end if;

  select count(*) into current_checkout_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'place_order_provider_v2_idempotent';

  if current_checkout_count = 0 then
    raise exception 'Provider-neutral checkout RPC is missing';
  end if;

  select count(*) into public_policy_count
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public';

  if public_policy_count = 0 then
    raise exception 'Fresh-install baseline has no public RLS policies';
  end if;

  execute 'select (select count(*) from public.products) + (select count(*) from public.product_variants) + (select count(*) from public.webshop_instances) + (select count(*) from public.orders) + (select count(*) from public.webshop_instance_commerce_settings)'
    into customer_rows;

  if customer_rows <> 0 then
    raise exception 'Fresh-install target contains customer-facing seed data before provisioning: % rows', customer_rows;
  end if;
end $$;

select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')) as public_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as public_functions,
  (select count(*) from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') as public_policies,
  0::bigint as customer_seed_rows,
  'target-postflight-ok'::text as status;
