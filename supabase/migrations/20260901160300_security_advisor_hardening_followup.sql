-- Close remaining architecture-hardening advisor findings without changing intended customer-facing RPC contracts.

alter view public.tenant_scope_gaps set (security_invoker=true);
alter view public.tenant_operational_scope_gaps set (security_invoker=true);
alter view public.merchant_intelligence_tenant_gaps set (security_invoker=true);

-- Legacy global checkout entry point: explicit-tenant v4 is the only trusted runtime checkout RPC.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='place_order_idempotent'
  loop execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature); end loop;
end $$;

-- Legacy global merchant-intelligence helpers are implementation details only. Tenant-safe v2 wrappers run as the function owner.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'create_customer_journey','add_customer_journey_step','plan_customer_retention_journeys','plan_customer_lifecycle_milestones','queue_due_customer_journey_steps','dispatch_due_customer_journey_steps',
      'process_control_tower_cycle','upsert_control_alert','transition_control_alert','transition_control_task','detect_customer_value_control_alerts','detect_system_control_alerts','plan_control_tasks','resolve_stale_control_alerts',
      'process_action_cycle','plan_action_proposals','expire_or_cancel_action_proposals','action_proposal_is_stale','simulate_action_proposal','decide_action_proposal','execute_action_proposal',
      'process_automation_cycle','set_automation_global_pause','activate_automation_runbook','transition_automation_instance','execute_automation_step','plan_automation_runbooks','cancel_stale_automation_incidents','refresh_automation_ready_steps','reconcile_automation_runbooks','guard_automation_step_source_current'
    ])
  loop execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature); end loop;
end $$;

-- Trigger/backfill helpers must not be exposed through PostgREST RPC.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'single_runtime_instance_id','apply_checkout_instance_context','sync_product_variant_instance','sync_order_item_instance','sync_variant_child_instance','sync_campaign_child_instance','sync_inventory_event_instance','sync_inventory_reservation_instance','prepare_admin_audit_entry','prevent_admin_audit_mutation','merchant_intelligence_store_guard','automation_child_store_guard'
    ])
  loop execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature); end loop;
end $$;
