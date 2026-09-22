-- V15 audit hardening: human_task steps wait for actual V13 task completion before advancing.
alter table public.automation_step_runs drop constraint if exists automation_step_runs_status_check;
alter table public.automation_step_runs add constraint automation_step_runs_status_check check(status in ('pending','ready','running','waiting','succeeded','failed','skipped','cancelled'));

create or replace function public.guard_automation_step_integrity()
returns trigger language plpgsql set search_path=''
as $$begin
 if new.instance_id is distinct from old.instance_id or new.step_id is distinct from old.step_id then raise exception 'automation_step_identity_immutable';end if;
 if old.status in ('succeeded','skipped','cancelled') and new.status is distinct from old.status then raise exception 'terminal_automation_step_immutable';end if;
 if old.status='pending' and new.status not in ('pending','ready','cancelled') then raise exception 'invalid_step_transition';end if;
 if old.status='ready' and new.status not in ('ready','running','cancelled') then raise exception 'invalid_step_transition';end if;
 if old.status='running' and new.status not in ('running','waiting','succeeded','failed') then raise exception 'invalid_step_transition';end if;
 if old.status='waiting' and new.status not in ('waiting','succeeded','failed','cancelled') then raise exception 'invalid_step_transition';end if;
 if old.status='failed' and new.status not in ('failed','ready','running','cancelled') then raise exception 'invalid_step_transition';end if;return new;end;$$;

create or replace function public.refresh_automation_ready_steps(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$declare x record;v_completed_tasks integer:=0;v_cancelled_tasks integer:=0;v_ready integer:=0;v_instances integer:=0;begin
 for x in select sr.id,sr.instance_id,sr.result,ct.status task_status from public.automation_step_runs sr left join public.control_tasks ct on ct.id=(sr.result->>'control_task_id')::uuid where sr.status='waiting' loop
   if x.task_status='completed' then
     update public.automation_step_runs set status='succeeded',finished_at=now(),updated_at=now(),result=result||jsonb_build_object('human_task_completed',true) where id=x.id;
     insert into public.automation_events(event_key,instance_id,step_run_id,event_type,metadata) values('human-complete:'||p_run_key||':'||x.id::text,x.instance_id,x.id,'step_succeeded',jsonb_build_object('reason','control_task_completed')) on conflict(event_key) do nothing;v_completed_tasks:=v_completed_tasks+1;
   elsif x.task_status='cancelled' then
     update public.automation_step_runs set status='failed',finished_at=now(),last_error='control_task_cancelled',next_attempt_at=null,updated_at=now() where id=x.id;
     update public.automation_runbook_instances set failure_count=failure_count+1,updated_at=now() where id=x.instance_id;
     insert into public.automation_events(event_key,instance_id,step_run_id,event_type,metadata) values('human-cancel:'||p_run_key||':'||x.id::text,x.instance_id,x.id,'step_failed',jsonb_build_object('reason','control_task_cancelled')) on conflict(event_key) do nothing;v_cancelled_tasks:=v_cancelled_tasks+1;
   end if;
 end loop;
 update public.automation_step_runs sr set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
 from public.automation_runbook_steps st,public.automation_runbook_instances i
 where sr.step_id=st.id and sr.instance_id=i.id and i.status='active' and sr.status='pending' and(
   st.requires_previous_success=false or not exists(
    select 1 from public.automation_step_runs prev join public.automation_runbook_steps ps on ps.id=prev.step_id
    where prev.instance_id=sr.instance_id and ps.step_order<st.step_order and prev.status not in ('succeeded','skipped')
   )
 );get diagnostics v_ready=row_count;
 for x in select i.id from public.automation_runbook_instances i where i.status='active' and not exists(select 1 from public.automation_step_runs sr where sr.instance_id=i.id and sr.status not in ('succeeded','skipped')) loop
   update public.automation_runbook_instances set status='completed',completed_at=now(),updated_at=now() where id=x.id;
   insert into public.automation_events(event_key,instance_id,event_type,metadata) values('auto-complete:'||p_run_key||':'||x.id::text,x.id,'completed',jsonb_build_object('reason','all_steps_succeeded')) on conflict(event_key) do nothing;v_instances:=v_instances+1;
 end loop;
 return jsonb_build_object('human_tasks_completed',v_completed_tasks,'human_tasks_cancelled',v_cancelled_tasks,'steps_ready',v_ready,'instances_completed',v_instances);end;$$;
revoke all on function public.refresh_automation_ready_steps(text) from public,anon,authenticated;grant execute on function public.refresh_automation_ready_steps(text) to service_role;

create or replace function public.execute_automation_step(p_instance_id uuid,p_actor_id uuid,p_execution_key text)
returns public.automation_step_runs language plpgsql security definer set search_path=''
as $$declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;s public.automation_step_runs;d public.automation_runbook_steps;c public.automation_control;v_task_id uuid;v_error text;begin
 if nullif(trim(p_execution_key),'') is null then raise exception 'execution_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 if exists(select 1 from public.automation_events where event_key='step-execute:'||p_execution_key) then select sr.* into s from public.automation_events e join public.automation_step_runs sr on sr.id=e.step_run_id where e.event_key='step-execute:'||p_execution_key;if s.instance_id<>p_instance_id then raise exception 'execution_key_conflict';end if;return s;end if;
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;if i.status<>'active' then raise exception 'instance_not_active';end if;
 select * into c from public.automation_control where singleton=true;if c.global_paused or(c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;select * into r from public.automation_runbooks where id=i.runbook_id;if not r.enabled then raise exception 'runbook_disabled';end if;
 select * into a from public.control_alerts where id=i.alert_id;if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;if not(i.source_snapshot ? 'incident_started_at') or(i.source_snapshot->>'incident_started_at')::timestamptz is distinct from a.incident_started_at then raise exception 'source_incident_stale';end if;
 if r.requires_action_approval then if i.proposal_id is null then raise exception 'approved_action_required';end if;select * into p from public.action_proposals where id=i.proposal_id;if p.status not in ('approved','executed') or public.action_proposal_is_stale(p.id) then raise exception 'approved_action_stale_or_missing';end if;end if;
 select sr.* into s from public.automation_step_runs sr join public.automation_runbook_steps st on st.id=sr.step_id where sr.instance_id=i.id and sr.status in ('ready','failed') and(sr.next_attempt_at is null or sr.next_attempt_at<=now()) order by st.step_order limit 1 for update of sr;if not found then raise exception 'no_executable_step';end if;select * into d from public.automation_runbook_steps where id=s.step_id;if s.status='failed' and s.attempt_count>=d.max_attempts then raise exception 'step_attempts_exhausted';end if;
 update public.automation_step_runs set status='running',attempt_count=attempt_count+1,started_at=now(),finished_at=null,last_error=null,updated_at=now() where id=s.id returning * into s;
 begin
   if d.action_kind in ('human_task','notify_admin') then
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation:'||i.id::text||':step:'||d.id::text,i.alert_id,'open',least(100,greatest(a.priority_score,case when d.action_kind='notify_admin' then 75 else 60 end)),case when d.action_kind='notify_admin' then 'Automatizálási értesítés · ' else 'Automatizálási feladat · ' end||d.name,coalesce(a.recommended_action,'Ellenőrizd a forráshelyzetet és rögzíts eredményt.'),now()+make_interval(mins=>d.timeout_minutes),jsonb_build_object('source','v15_runbook','instance_id',i.id,'step_id',d.id,'runbook_key',r.runbook_key,'action_kind',d.action_kind))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),due_at=least(public.control_tasks.due_at,excluded.due_at),updated_at=now() returning id into v_task_id;
   end if;
   if d.action_kind='human_task' then
     update public.automation_step_runs set status='waiting',result=jsonb_build_object('action_kind',d.action_kind,'control_task_id',v_task_id,'awaiting_human_completion',true),updated_at=now() where id=s.id returning * into s;
     insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_waiting',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'control_task_id',v_task_id));update public.automation_control set consecutive_failures=0,updated_at=now() where singleton=true;return s;
   end if;
   update public.automation_step_runs set status='succeeded',finished_at=now(),next_attempt_at=null,result=jsonb_build_object('action_kind',d.action_kind,'control_task_id',v_task_id,'executed_control_plane_only',true),updated_at=now() where id=s.id returning * into s;
   insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_succeeded',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'action_kind',d.action_kind,'control_task_id',v_task_id));update public.automation_control set consecutive_failures=0,updated_at=now() where singleton=true;perform public.refresh_automation_ready_steps('execute:'||p_execution_key);return s;
 exception when others then
   v_error:=sqlerrm;update public.automation_step_runs set status='failed',finished_at=now(),last_error=v_error,next_attempt_at=case when attempt_count<d.max_attempts then now()+make_interval(mins=>d.retry_backoff_minutes*greatest(attempt_count,1)) else null end,updated_at=now() where id=s.id returning * into s;update public.automation_runbook_instances set failure_count=failure_count+1,updated_at=now() where id=i.id;update public.automation_control set consecutive_failures=consecutive_failures+1,circuit_open_until=case when consecutive_failures+1>=5 then now()+interval '30 minutes' else circuit_open_until end,updated_at=now() where singleton=true;insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_failed',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'error',v_error));return s;
 end;end;$$;
revoke all on function public.execute_automation_step(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.execute_automation_step(uuid,uuid,text) to service_role;

create or replace function public.process_automation_cycle(p_run_key text)
returns public.automation_processing_runs language plpgsql security definer set search_path=''
as $$declare x public.automation_processing_runs;v_stale integer;v_sync jsonb;v_plan jsonb;v_rec jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-cycle:'||p_run_key,0));select * into x from public.automation_processing_runs where run_key=p_run_key;if found and x.completed_at is not null then return x;end if;if not found then insert into public.automation_processing_runs(run_key) values(p_run_key) returning * into x;end if;
 select public.cancel_stale_automation_incidents(p_run_key) into v_stale;select public.refresh_automation_ready_steps(p_run_key) into v_sync;select public.plan_automation_runbooks(p_run_key) into v_plan;select public.reconcile_automation_runbooks(p_run_key) into v_rec;v_rec:=v_rec||jsonb_build_object('stale_incidents_cancelled',v_stale,'step_sync',v_sync);
 update public.automation_processing_runs set planned=v_plan,reconciled=v_rec,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('cancel_stale_incidents','sync_human_steps','plan','reconcile')) where id=x.id returning * into x;return x;end;$$;
revoke all on function public.process_automation_cycle(text) from public,anon,authenticated;grant execute on function public.process_automation_cycle(text) to service_role;
