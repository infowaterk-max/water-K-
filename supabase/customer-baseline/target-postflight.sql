-- Shoperation fresh-install target postflight.
-- Read-only proof: run after applying the reviewed Shoperation baseline
-- and the neutral customer-baseline seed, before provisioning any customer data.

do $$
declare
  missing text[] := array[]::text[];
  profile_default text;
  instance_default text;
  legacy_checkout_count integer;
  current_checkout_count integer;
  current_quote_count integer;
  public_policy_count integer;
  customer_rows bigint;
  helper_count integer;
  bad_helper_count integer;
  missing_policy_count integer;
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
    raise exception 'Fresh-install baseline is incomplete. Missing release objects: %', array_to_string(missing, ', ');
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
  where n.nspname = 'public' and p.proname = 'place_order_provider_v5_idempotent';

  select count(*) into current_quote_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'quote_tenant_checkout_v2';

  if current_checkout_count <> 1 then
    raise exception 'Current V5 atomic checkout RPC is missing or ambiguous: %', current_checkout_count;
  end if;
  if current_quote_count <> 1 then
    raise exception 'Current V2 tenant quote RPC is missing or ambiguous: %', current_quote_count;
  end if;

  select count(*) into missing_policy_count
  from (values
    ('return_cases_store_all'),
    ('return_case_items_store_all'),
    ('support_tickets_store_all'),
    ('support_ticket_messages_store_all'),
    ('office_threads_store_all'),
    ('office_messages_store_all'),
    ('office_tasks_store_all'),
    ('content_store_read'),
    ('products_store_read'),
    ('variants_store_read'),
    ('orders_customer_or_store_read'),
    ('order_items_customer_or_store_read'),
    ('customer_instance_roles_self_select')
  ) v(policyname)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.policyname = v.policyname
  );

  if missing_policy_count <> 0 then
    raise exception 'Required tenant RLS policies are missing: %', missing_policy_count;
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

  select count(*) into public_policy_count
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public';

  if public_policy_count = 0 then
    raise exception 'Fresh-install baseline has no public RLS policies';
  end if;

  execute 'select
      (select count(*) from public.products)
    + (select count(*) from public.product_variants)
    + (select count(*) from public.webshop_instances)
    + (select count(*) from public.orders)
    + (select count(*) from public.webshop_instance_commerce_settings)
    + (select count(*) from public.customer_instance_roles)'
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
