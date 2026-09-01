-- Preflight closure for legacy global SECURITY DEFINER RPCs that already have tenant-safe replacements.
-- Merchant/customer HTTP handlers use service-role application code; direct PostgREST execution is intentionally denied.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'place_order_provider','place_order_provider_v2','place_order_provider_v3_idempotent',
      'create_purchase_order','transition_purchase_order','receive_purchase_order','receive_purchase_order_items',
      'plan_commercial_opportunities','plan_high_value_sales_tasks','create_commercial_offer','approve_commercial_offer','transition_commercial_offer'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;

-- Only tenant-aware application RPCs remain callable by the trusted service role.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'place_order_provider_v4_idempotent',
      'create_purchase_order_v2','transition_purchase_order_v2','receive_purchase_order_v2','receive_purchase_order_items_v2',
      'plan_commercial_opportunities_v2','plan_high_value_sales_tasks_v2','create_commercial_offer_v2','approve_commercial_offer_v2','transition_commercial_offer_v2'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;

comment on function public.single_runtime_instance_id() is 'Migration/backfill helper only. Runtime business operations must carry explicit instance_id.';
