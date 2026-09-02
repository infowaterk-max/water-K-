-- Close the final pre-provider checkout RPC left by legacy production upgrades.
-- Also align legacy-upgraded server-only table grants with the reviewed current baseline.

drop function if exists public.place_order(
  text, text, text, text, text, text, text, text,
  text, text, text, jsonb
);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'place_order'
  ) then
    raise exception 'Legacy public.place_order overloads are still present after cleanup.';
  end if;
end $$;

revoke all privileges on table public.communication_job_events from public, anon, authenticated;
revoke all privileges on table public.inventory_snapshots from public, anon, authenticated;
revoke all privileges on table public.purchase_order_items from public, anon, authenticated;
revoke all privileges on table public.purchase_orders from public, anon, authenticated;
revoke all privileges on table public.suppliers from public, anon, authenticated;

grant all privileges on table public.communication_job_events to service_role;
grant all privileges on table public.inventory_snapshots to service_role;
grant all privileges on table public.purchase_order_items to service_role;
grant all privileges on table public.purchase_orders to service_role;
grant all privileges on table public.suppliers to service_role;
