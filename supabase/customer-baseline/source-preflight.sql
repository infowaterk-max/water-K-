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
  current_quote_count integer;
  helper_count integer;
  bad_helper_count integer;
  protected_table text;
  protected_oid oid;
  protected_rls boolean;
  protected_policy_count integer;
  browser_grant_count integer;
  service_select_count integer;
  exposed_no_policy_count integer;
begin
  if to_regclass('public.webshop_instances') is null then missing := array_append(missing, 'public.webshop_instances'); end if;
  if to_regclass('public.profiles') is null then missing := array_append(missing, 'public.profiles'); end if;
  if to_regclass('public.products') is null then missing := array_append(missing, 'public.products'); end if;
  if to_regclass('public.product_variants') is null then missing := array_append(missing, 'public.product_variants'); end if;
  if to_regclass('public.orders') is null then missing := array_append(missing, 'public.orders'); end if;
  if to_regclass('public.commerce_provider_catalog') is null then missing := array_append(missing, 'public.commerce_provider_catalog'); end if;
  if to_regclass('public.webshop_instance_commerce_settings') is null then missing := array_append(missing, 'public.webshop_instance_commerce_settings'); end if;
  if to_regclass('public.customer_instance_roles') is null then missing := array_append(missing, 'public.customer_instance_roles'); end if;
  if to_regclass('public.coupon_redemptions') is null then missing := array_append(missing, 'public.coupon_redemptions'); end if;

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
  where n.nspname = 'public' and p.proname = 'place_order_provider_v5_idempotent';

  select count(*) into current_quote_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'quote_tenant_checkout_v2';

  if current_checkout_count <> 1 then
    raise exception 'Current V5 provider-neutral atomic checkout RPC is missing or ambiguous: %', current_checkout_count;
  end if;

  if current_quote_count <> 1 then
    raise exception 'Current V2 tenant-aware checkout quote RPC is missing or ambiguous: %', current_quote_count;
  end if;

  select count(*) into helper_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'is_platform_operator','has_store_role','has_feature_entitlement',
      'can_read_store','can_manage_catalog','can_manage_orders','can_manage_marketing',
      'can_manage_support','can_manage_procurement','can_manage_sales',
      'can_read_loyalty','can_manage_loyalty'
    );

  if helper_count <> 12 then
    raise exception 'Permission helper set is incomplete: %/12', helper_count;
  end if;

  select count(*) into bad_helper_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'is_platform_operator','has_store_role','has_feature_entitlement',
      'can_read_store','can_manage_catalog','can_manage_orders','can_manage_marketing',
      'can_manage_support','can_manage_procurement','can_manage_sales',
      'can_read_loyalty','can_manage_loyalty'
    )
    and (
      p.prosecdef
      or has_function_privilege('public', p.oid, 'execute')
      or has_function_privilege('anon', p.oid, 'execute')
      or not has_function_privilege('authenticated', p.oid, 'execute')
      or not has_function_privilege('service_role', p.oid, 'execute')
    );

  if bad_helper_count <> 0 then
    raise exception 'Permission helper privilege mismatch: %', bad_helper_count;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('quote_tenant_checkout_v2','place_order_provider_v5_idempotent')
      and (
        not p.prosecdef
        or has_function_privilege('public', p.oid, 'execute')
        or has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
        or not has_function_privilege('service_role', p.oid, 'execute')
      )
  ) then
    raise exception 'Checkout RPC privilege model does not match the hardened release contract';
  end if;

  -- These control-plane/configuration tables are intentionally server-only.
  -- Browser roles must not receive direct grants or policies; Shoperation server code
  -- reaches them through the service-role admin client after application-level auth.
  foreach protected_table in array array[
    'webshop_instances',
    'webshop_instance_members',
    'webshop_instance_commerce_settings',
    'webshop_instance_provider_connections',
    'commerce_provider_catalog',
    'platform_operators',
    'communication_job_events',
    'inventory_snapshots',
    'purchase_order_items',
    'purchase_orders',
    'suppliers'
  ] loop
    select c.oid, c.relrowsecurity
      into protected_oid, protected_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = protected_table and c.relkind in ('r','p');

    if protected_oid is null then
      raise exception 'Protected server-only table is missing: public.%', protected_table;
    end if;

    select count(*) into protected_policy_count from pg_policy where polrelid = protected_oid;
    if not protected_rls or protected_policy_count <> 0 then
      raise exception 'Server-only boundary drift on public.%: rls=%, policies=%', protected_table, protected_rls, protected_policy_count;
    end if;

    select count(*) into browser_grant_count
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = protected_table
      and grantee in ('anon','authenticated','PUBLIC');

    if browser_grant_count <> 0 then
      raise exception 'Browser-role grants found on server-only table public.%: %', protected_table, browser_grant_count;
    end if;

    select count(*) into service_select_count
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = protected_table
      and grantee = 'service_role'
      and privilege_type = 'SELECT';

    if service_select_count = 0 then
      raise exception 'service_role SELECT is missing on server-only table public.%', protected_table;
    end if;
  end loop;

  -- Generic safety net for every public RLS table with zero policies. Such tables are
  -- intentionally deny-by-default and must never retain direct browser-role grants.
  select count(*) into exposed_no_policy_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p')
    and c.relrowsecurity
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
    and exists (
      select 1
      from information_schema.table_privileges tp
      where tp.table_schema = 'public'
        and tp.table_name = c.relname
        and tp.grantee in ('anon','authenticated','PUBLIC')
    );

  if exposed_no_policy_count <> 0 then
    raise exception 'Public RLS tables without policies still expose browser-role grants: %', exposed_no_policy_count;
  end if;
end $$;

select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')) as public_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as public_functions,
  (select count(*) from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') as public_policies,
  'source-preflight-ok'::text as status;
