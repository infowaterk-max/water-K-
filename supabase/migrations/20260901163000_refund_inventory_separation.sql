-- Core Engine 2.0: financial refund must never imply a physical stock return.
-- Cancellation and item-safe return-case restock are the only inventory restoration paths.

create or replace function public.restore_refunded_pre_fulfillment_inventory()
returns integer
language plpgsql
security definer
set search_path=''
as $$
begin
  -- Compatibility no-op. Kept because older operations-cycle code may still call it.
  -- A financial refund is not evidence that goods physically returned to stock.
  return 0;
end $$;

revoke all on function public.restore_refunded_pre_fulfillment_inventory() from public, anon, authenticated;
grant execute on function public.restore_refunded_pre_fulfillment_inventory() to service_role;

create or replace function public.reconcile_inventory_reservations()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_released integer:=0;
  v_reserved integer:=0;
  v_blocked integer:=0;
  r record;
  v_result jsonb;
begin
  update public.inventory_reservations ir
     set status='released',
         released_at=coalesce(ir.released_at,now()),
         reason=coalesce(ir.reason,'Rendelés törölve'),
         updated_at=now()
    from public.orders o
   where o.id=ir.order_id
     and o.instance_id=ir.instance_id
     and o.status='cancelled'
     and ir.status='active';
  get diagnostics v_released=row_count;

  update public.order_operations op
     set operational_status='cancelled',exception_code=null,updated_at=now()
    from public.orders o
   where o.id=op.order_id
     and o.instance_id=op.instance_id
     and o.status='cancelled'
     and op.operational_status not in ('handed_over','delivered','cancelled');

  -- Refunded orders are deliberately not restocked here. Physical returns are
  -- handled by the item-level return-case restock ledger.
  for r in
    select o.id
      from public.orders o
      left join public.order_operations op on op.order_id=o.id and op.instance_id=o.instance_id
     where o.status in ('pending','paid','processing','shipped','completed')
       and (op.order_id is null or not exists(
         select 1 from public.inventory_reservations ir
          where ir.order_id=o.id and ir.instance_id=o.instance_id
       ))
     order by o.created_at
  loop
    begin
      select public.reserve_inventory_for_order(r.id) into v_result;
      v_reserved:=v_reserved+coalesce((v_result->>'created_reservations')::integer,0);
    exception when others then
      v_blocked:=v_blocked+1;
      update public.order_operations
         set operational_status='blocked',
             exception_code='reservation_reconciliation_failed',
             blocked_at=coalesce(blocked_at,now()),
             updated_at=now(),
             metadata=metadata||jsonb_build_object('last_reconciliation_error',sqlerrm)
       where order_id=r.id;
    end;
  end loop;

  return jsonb_build_object(
    'released_reservations',v_released,
    'created_reservations',v_reserved,
    'blocked_orders',v_blocked,
    'refund_restored_units',0,
    'refund_inventory_policy','return_case_only'
  );
end $$;

revoke all on function public.reconcile_inventory_reservations() from public, anon, authenticated;
grant execute on function public.reconcile_inventory_reservations() to service_role;

create or replace function public.process_operations_cycle(p_run_key text)
returns public.operations_processing_runs
language plpgsql
security definer
set search_path=''
as $$
declare
  v public.operations_processing_runs;
  v_reconciled jsonb;
  v_priorities integer;
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('operations-cycle:'||p_run_key,0));
  select * into v from public.operations_processing_runs where run_key=p_run_key;
  if found and v.completed_at is not null then return v; end if;
  if not found then insert into public.operations_processing_runs(run_key) values(p_run_key) returning * into v; end if;
  select public.reconcile_inventory_reservations() into v_reconciled;
  select public.refresh_order_operation_priorities() into v_priorities;
  update public.operations_processing_runs
     set reconciled=v_reconciled,
         priorities_refreshed=v_priorities,
         completed_at=now(),
         metadata=jsonb_build_object(
           'sequence',jsonb_build_array('reconcile_inventory','refresh_priorities'),
           'refund_inventory_policy','return_case_only'
         )
   where id=v.id
   returning * into v;
  return v;
end $$;

revoke all on function public.process_operations_cycle(text) from public, anon, authenticated;
grant execute on function public.process_operations_cycle(text) to service_role;

-- This internal reservation primitive must not be callable directly by shoppers.
revoke all on function public.reserve_inventory_for_order(uuid) from public, anon, authenticated;
grant execute on function public.reserve_inventory_for_order(uuid) to service_role;
