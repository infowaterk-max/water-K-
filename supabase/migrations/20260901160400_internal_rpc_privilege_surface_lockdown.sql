-- Restrict Workbench/admin/worker SECURITY DEFINER entry points to the trusted service role.
-- Customer-facing and RLS helper functions are intentionally not changed here.

do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'admin_approve_communication_job','admin_block_communication_email','admin_manage_communication_job','admin_manage_marketing_campaign','admin_release_communication_suppression',
      'bulk_update_product_variants','capture_inventory_snapshot','claim_communication_jobs','claim_integration_job','claim_integration_jobs','complete_communication_job','fail_communication_job','recover_stale_communication_jobs',
      'process_operations_cycle','purge_observability_events','reconcile_inventory_reservations','refresh_order_operation_priorities','transition_order_operation','restock_return_case','transition_return_case',
      'add_release_change','cancel_release_candidate','create_release_candidate','decide_release_candidate','evaluate_release_candidate','expire_stale_release_candidates','process_release_governance_cycle','reconcile_release_candidates','release_candidate_is_stale','release_change_set_hash','release_ci_is_trusted','release_window_status','update_release_ci_evidence',
      'decide_rollout','record_rollout_check',
      'evaluate_assurance_control','expire_assurance_risk_acceptances','process_assurance_cycle','process_assurance_readiness_cycle','reconcile_assurance_findings','transition_assurance_finding',
      'decide_post_release_rollback','decide_post_release_session','process_post_release_cycle','reconcile_post_release_session','record_post_release_evidence','set_post_release_finding_state','start_post_release_session',
      'block_post_release_immutable_mutation','block_rollout_ledger_mutation','guard_assurance_append_only','guard_assurance_control_version','guard_assurance_finding_identity','guard_release_audit_immutable','guard_release_candidate_identity','guard_release_policy_definition'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
