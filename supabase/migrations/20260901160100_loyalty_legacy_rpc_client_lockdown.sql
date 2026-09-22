-- Prevent direct client execution of legacy global loyalty SECURITY DEFINER functions.
-- service_role compatibility is temporarily retained until the full loyalty lifecycle is migrated to explicit instance_id variants.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'accrue_loyalty_points_from_paid_orders','apply_loyalty_tier_bonus_points','refresh_customer_value_profiles',
      'reverse_loyalty_points_for_ineligible_orders','process_loyalty_lifecycle','plan_loyalty_retention_opportunities',
      'get_customer_loyalty_snapshot','redeem_loyalty_points','use_loyalty_benefit','use_discount_loyalty_benefit'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
  end loop;
end $$;

-- Current explicit-tenant read/refresh/accrual functions are trusted application-only entry points.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'refresh_customer_value_profiles_v2','accrue_loyalty_points_from_paid_orders_v2','get_customer_loyalty_snapshot_v2'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
