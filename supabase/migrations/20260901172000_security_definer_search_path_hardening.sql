-- Normalize SECURITY DEFINER search_path for hardening functions introduced by the architecture package.
-- Uses pg_proc discovery so overload signatures are handled safely.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and p.proname = any(array[
        'is_platform_operator','has_store_role','has_feature_entitlement',
        'can_read_store','can_manage_catalog','can_manage_orders','can_manage_marketing',
        'can_read_loyalty','can_mutate_loyalty','ensure_loyalty_program_settings',
        'prepare_admin_audit_entry','prevent_admin_audit_mutation',
        'mi_fill_child_tenant','mi_fill_alert_tenant_context',
        'transition_control_alert_v2','transition_control_task_v2',
        'simulate_action_proposal_v2','decide_action_proposal_v2','execute_action_proposal_v2',
        'activate_automation_runbook_v2','transition_automation_instance_v2','execute_automation_step_v2',
        'create_customer_journey_v2','plan_customer_retention_journeys_v2',
        'expire_or_cancel_action_proposals_v2','plan_action_proposals_v2','process_action_cycle_v2',
        'plan_automation_runbooks_v2','cancel_stale_automation_incidents_v2','refresh_automation_ready_steps_v2',
        'reconcile_automation_runbooks_v2','process_automation_cycle_v2',
        'upsert_control_alert_v2','detect_merchant_control_alerts_v2','resolve_stale_merchant_control_alerts_v2',
        'plan_control_tasks_v2','process_control_tower_cycle_v2',
        'enqueue_communication_v2'
      ])
  loop
    execute format('alter function %s set search_path to %L',r.signature,'');
  end loop;
end $$;
