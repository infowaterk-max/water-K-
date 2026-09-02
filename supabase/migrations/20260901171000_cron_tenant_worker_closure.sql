-- Cron tenant closure: retire the global integration batch claim after runtime moved to per-instance claiming.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='claim_integration_jobs'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;
