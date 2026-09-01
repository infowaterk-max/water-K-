-- Merchant intelligence tenant boundary wrappers.
-- Legacy engines remain locked; these wrappers make object-level mutations fail closed by instance.

create or replace function public.transition_control_alert_v2(p_instance_id uuid,p_alert_id uuid,p_target_status text,p_event_key text,p_actor_id uuid default null,p_snoozed_until timestamptz default null,p_note text default null)
returns public.control_alerts language plpgsql security definer set search_path to '' as $$
declare r public.control_alerts;
begin
 if p_instance_id is null then raise exception 'instance_id_required'; end if;
 perform 1 from public.control_alerts where id=p_alert_id and instance_id=p_instance_id for update;
 if not found then raise exception 'control_alert_not_found'; end if;
 select public.transition_control_alert(p_alert_id,p_target_status,p_instance_id::text||':'||p_event_key,p_actor_id,p_snoozed_until,p_note) into r;
 if r.instance_id is distinct from p_instance_id then raise exception 'tenant_mismatch'; end if; return r;
end$$;

create or replace function public.transition_control_task_v2(p_instance_id uuid,p_task_id uuid,p_target_status text,p_event_key text,p_actor_id uuid default null,p_outcome text default null)
returns public.control_tasks language plpgsql security definer set search_path to '' as $$
declare r public.control_tasks;
begin
 if p_instance_id is null then raise exception 'instance_id_required'; end if;
 perform 1 from public.control_tasks where id=p_task_id and instance_id=p_instance_id for update;
 if not found then raise exception 'control_task_not_found'; end if;
 select public.transition_control_task(p_task_id,p_target_status,p_instance_id::text||':'||p_event_key,p_actor_id,p_outcome) into r;
 if r.instance_id is distinct from p_instance_id then raise exception 'tenant_mismatch'; end if; return r;
end$$;

create or replace function public.simulate_action_proposal_v2(p_instance_id uuid,p_proposal_id uuid,p_actor_id uuid,p_event_key text)
returns public.action_proposals language plpgsql security definer set search_path to '' as $$
declare r public.action_proposals;
begin
 perform 1 from public.action_proposals where id=p_proposal_id and instance_id=p_instance_id for update;
 if not found then raise exception 'proposal_not_found'; end if;
 select public.simulate_action_proposal(p_proposal_id,p_actor_id,p_instance_id::text||':'||p_event_key) into r;
 if r.instance_id is distinct from p_instance_id then raise exception 'tenant_mismatch'; end if; return r;
end$$;

create or replace function public.decide_action_proposal_v2(p_instance_id uuid,p_proposal_id uuid,p_actor_id uuid,p_decision text,p_note text,p_event_key text)
returns public.action_proposals language plpgsql security definer set search_path to '' as $$
declare r public.action_proposals;
begin
 perform 1 from public.action_proposals where id=p_proposal_id and instance_id=p_instance_id for update;
 if not found then raise exception 'proposal_not_found'; end if;
 select public.decide_action_proposal(p_proposal_id,p_actor_id,p_decision,p_note,p_instance_id::text||':'||p_event_key) into r;
 if r.instance_id is distinct from p_instance_id then raise exception 'tenant_mismatch'; end if; return r;
end$$;

create or replace function public.execute_action_proposal_v2(p_instance_id uuid,p_proposal_id uuid,p_actor_id uuid,p_execution_key text)
returns public.action_executions language plpgsql security definer set search_path to '' as $$
declare r public.action_executions;
begin
 perform 1 from public.action_proposals where id=p_proposal_id and instance_id=p_instance_id for update;
 if not found then raise exception 'proposal_not_found'; end if;
 perform set_config('shoperation.instance_id',p_instance_id::text,true);
 select public.execute_action_proposal(p_proposal_id,p_actor_id,p_instance_id::text||':'||p_execution_key) into r;
 return r;
end$$;

create or replace function public.activate_automation_runbook_v2(p_store_instance_id uuid,p_runbook_instance_id uuid,p_actor_id uuid,p_event_key text)
returns public.automation_runbook_instances language plpgsql security definer set search_path to '' as $$
declare r public.automation_runbook_instances;
begin
 perform 1 from public.automation_runbook_instances where id=p_runbook_instance_id and instance_id=p_store_instance_id for update;
 if not found then raise exception 'automation_instance_not_found'; end if;
 select public.activate_automation_runbook(p_runbook_instance_id,p_actor_id,p_store_instance_id::text||':'||p_event_key) into r;
 if r.instance_id is distinct from p_store_instance_id then raise exception 'tenant_mismatch'; end if; return r;
end$$;

create or replace function public.transition_automation_instance_v2(p_store_instance_id uuid,p_runbook_instance_id uuid,p_actor_id uuid,p_target text,p_event_key text,p_reason text default null)
returns public.automation_runbook_instances language plpgsql security definer set search_path to '' as $$
declare r public.automation_runbook_instances;
begin
 perform 1 from public.automation_runbook_instances where id=p_runbook_instance_id and instance_id=p_store_instance_id for update;
 if not found then raise exception 'automation_instance_not_found'; end if;
 select public.transition_automation_instance(p_runbook_instance_id,p_actor_id,p_target,p_store_instance_id::text||':'||p_event_key,p_reason) into r;
 if r.instance_id is distinct from p_store_instance_id then raise exception 'tenant_mismatch'; end if; return r;
end$$;

create or replace function public.execute_automation_step_v2(p_store_instance_id uuid,p_runbook_instance_id uuid,p_actor_id uuid,p_execution_key text)
returns public.automation_step_runs language plpgsql security definer set search_path to '' as $$
declare r public.automation_step_runs;
begin
 perform 1 from public.automation_runbook_instances where id=p_runbook_instance_id and instance_id=p_store_instance_id for update;
 if not found then raise exception 'automation_instance_not_found'; end if;
 perform set_config('shoperation.instance_id',p_store_instance_id::text,true);
 select public.execute_automation_step(p_runbook_instance_id,p_actor_id,p_store_instance_id::text||':'||p_execution_key) into r;
 return r;
end$$;

-- Direct clients must never execute legacy or wrapper control-plane engines.
revoke execute on function public.transition_control_alert(uuid,text,text,uuid,timestamptz,text) from public,anon,authenticated;
revoke execute on function public.transition_control_task(uuid,text,text,uuid,text) from public,anon,authenticated;
revoke execute on function public.simulate_action_proposal(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.decide_action_proposal(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke execute on function public.execute_action_proposal(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.activate_automation_runbook(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.transition_automation_instance(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke execute on function public.execute_automation_step(uuid,uuid,text) from public,anon,authenticated;

revoke all on function public.transition_control_alert_v2(uuid,uuid,text,text,uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.transition_control_task_v2(uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
revoke all on function public.simulate_action_proposal_v2(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.decide_action_proposal_v2(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.execute_action_proposal_v2(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.activate_automation_runbook_v2(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.transition_automation_instance_v2(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.execute_automation_step_v2(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.transition_control_alert_v2(uuid,uuid,text,text,uuid,timestamptz,text),public.transition_control_task_v2(uuid,uuid,text,text,uuid,text),public.simulate_action_proposal_v2(uuid,uuid,uuid,text),public.decide_action_proposal_v2(uuid,uuid,uuid,text,text,text),public.execute_action_proposal_v2(uuid,uuid,uuid,text),public.activate_automation_runbook_v2(uuid,uuid,uuid,text),public.transition_automation_instance_v2(uuid,uuid,uuid,text,text,text),public.execute_automation_step_v2(uuid,uuid,uuid,text) to service_role;
