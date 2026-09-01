-- Follow-up lockdown for legacy idempotent checkout RPCs discovered during production ACL verification.
-- The v4 explicit-tenant checkout remains the only service-callable checkout entry point.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'place_order_provider_idempotent','place_order_provider_v2_idempotent'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;
