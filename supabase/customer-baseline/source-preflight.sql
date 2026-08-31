-- Shoperation customer baseline source preflight.
-- Read-only guard: run this against the reviewed non-production schema source
-- before generating 0001_shoperation_v1_schema.sql.

do $$
declare
  missing text[] := array[]::text[];
  profile_default text;
  instance_default text;
  legacy_checkout_count integer;
  current_checkout_count integer;
begin
  if to_regclass('public.webshop_instances') is null then missing := array_append(missing, 'public.webshop_instances'); end if;
  if to_regclass('public.profiles') is null then missing := array_append(missing, 'public.profiles'); end if;
  if to_regclass('public.products') is null then missing := array_append(missing, 'public.products'); end if;
  if to_regclass('public.orders') is null then missing := array_append(missing, 'public.orders'); end if;
  if to_regclass('public.commerce_provider_catalog') is null then missing := array_append(missing, 'public.commerce_provider_catalog'); end if;
  if to_regclass('public.webshop_instance_commerce_settings') is null then missing := array_append(missing, 'public.webshop_instance_commerce_settings'); end if;

  if cardinality(missing) > 0 then
    raise exception 'Baseline source is incomplete. Missing core objects: %', array_to_string(missing, ', ');
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
    raise exception 'Legacy public.place_order overloads are still present: %', legacy_checkout_count;
  end if;

  select count(*) into current_checkout_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'place_order_provider_v2_idempotent';

  if current_checkout_count = 0 then
    raise exception 'Current provider-neutral checkout RPC is missing';
  end if;
end $$;

select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')) as public_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as public_functions,
  (select count(*) from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') as public_policies,
  'source-preflight-ok'::text as status;
