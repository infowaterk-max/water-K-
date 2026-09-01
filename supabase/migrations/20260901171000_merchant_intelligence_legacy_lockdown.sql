-- Final direct-execution lockdown for legacy merchant-intelligence engines.
revoke execute on function public.create_customer_journey(public.customer_journey_kind,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
revoke execute on function public.plan_customer_retention_journeys() from public,anon,authenticated,service_role;
revoke execute on function public.plan_action_proposals(text),public.expire_or_cancel_action_proposals(text),public.process_action_cycle(text) from public,anon,authenticated,service_role;
revoke execute on function public.simulate_action_proposal(uuid,uuid,text),public.decide_action_proposal(uuid,uuid,text,text,text),public.execute_action_proposal(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke execute on function public.plan_automation_runbooks(text),public.cancel_stale_automation_incidents(text),public.refresh_automation_ready_steps(text),public.reconcile_automation_runbooks(text),public.process_automation_cycle(text) from public,anon,authenticated,service_role;
revoke execute on function public.activate_automation_runbook(uuid,uuid,text),public.transition_automation_instance(uuid,uuid,text,text,text),public.execute_automation_step(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke execute on function public.process_control_tower_cycle(text),public.transition_control_alert(uuid,text,text,uuid,timestamptz,text),public.transition_control_task(uuid,text,text,uuid,text),public.upsert_control_alert(text,text,text,text,integer,text,text,text,text,uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
-- Global emergency pause is platform control-plane only; application route authorization is platform-only.
revoke execute on function public.set_automation_global_pause(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.set_automation_global_pause(uuid,boolean,text,text) to service_role;
