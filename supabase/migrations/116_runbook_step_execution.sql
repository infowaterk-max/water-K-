-- V15: safe step executor, retry/backoff and completion semantics.
create or replace function public.execute_automation_step(p_instance_id uuid,p_actor_id uuid,p_execution_key text)
returns public.automation_step_runs language plpgsql security definer set search_path=''
as $$
declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;s public.automation_step_runs;d public.automation_runbook_steps;c public.automation_control;v_task_id uuid;v_remaining integer;v_error text;begin
 if nullif(trim(p_execution_key),'') is null then raise exception 'execution_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 if exists(select 1 from public.automation_events where event_key='step-execute:'||p_execution_key) then
   select sr.* into s from public.automation_events e join public.automation_step_runs sr on sr.id=e.step_run_id where e.event_key='step-execute:'||p_execution_key;
   if s.instance_id<>p_instance_id then raise exception 'execution_key_conflict';end if;return s;
 end if;
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;
 if i.status<>'active' then raise exception 'instance_not_active';end if;
 select * into c from public.automation_control where singleton=true;if c.global_paused or(c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;
 select * into r from public.automation_runbooks where id=i.runbook_id;if not r.enabled then raise exception 'runbook_disabled';end if;
 select * into a from public.control_alerts where id=i.alert_id;if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
 if r.requires_action_approval then
   if i.proposal_id is null then raise exception 'approved_action_required';end if;select * into p from public.action_proposals where id=i.proposal_id;
   if p.status not in ('approved','executed') or public.action_proposal_is_stale(p.id) then raise exception 'approved_action_stale_or_missing';end if;
 end if;
 select sr.* into s from public.automation_step_runs sr join public.automation_runbook_steps st on st.id=sr.step_id
 where sr.instance_id=i.id and sr.status in ('ready','failed') and (sr.next_attempt_at is null or sr.next_attempt_at<=now())
 order by st.step_order limit 1 for update of sr;
 if not found then raise exception 'no_executable_step';end if;select * into d from public.automation_runbook_steps where id=s.step_id;
 if s.status='failed' and s.attempt_count>=d.max_attempts then raise exception 'step_attempts_exhausted';end if;
 update public.automation_step_runs set status='running',attempt_count=attempt_count+1,started_at=now(),last_error=null,updated_at=now() where id=s.id returning * into s;
 begin
   if d.action_kind in ('human_task','notify_admin') then
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation:'||i.id::text||':step:'||d.id::text,i.alert_id,'open',least(100,greatest(a.priority_score,case when d.action_kind='notify_admin' then 75 else 60 end)),
       case when d.action_kind='notify_admin' then 'Automatizálási értesítés · ' else 'Automatizálási feladat · ' end||d.name,
       coalesce(a.recommended_action,'Ellenőrizd a forráshelyzetet és rögzíts eredményt.'),now()+make_interval(mins=>d.timeout_minutes),
       jsonb_build_object('source','v15_runbook','instance_id',i.id,'step_id',d.id,'runbook_key',r.runbook_key,'action_kind',d.action_kind))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),due_at=least(public.control_tasks.due_at,excluded.due_at),updated_at=now()
     returning id into v_task_id;
   end if;
   update public.automation_step_runs set status='succeeded',finished_at=now(),next_attempt_at=null,result=jsonb_build_object('action_kind',d.action_kind,'control_task_id',v_task_id,'executed_control_plane_only',true),updated_at=now() where id=s.id returning * into s;
   insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata)
   values('step-execute:'||p_execution_key,i.id,s.id,'step_succeeded',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'action_kind',d.action_kind,'control_task_id',v_task_id));
   update public.automation_control set consecutive_failures=0,updated_at=now() where singleton=true;
 exception when others then
   v_error:=sqlerrm;
   update public.automation_step_runs set status='failed',finished_at=now(),last_error=v_error,next_attempt_at=case when attempt_count<d.max_attempts then now()+make_interval(mins=>d.retry_backoff_minutes*greatest(attempt_count,1)) else null end,updated_at=now() where id=s.id returning * into s;
   update public.automation_runbook_instances set failure_count=failure_count+1,updated_at=now() where id=i.id;
   update public.automation_control set consecutive_failures=consecutive_failures+1,circuit_open_until=case when consecutive_failures+1>=5 then now()+interval '30 minutes' else circuit_open_until end,updated_at=now() where singleton=true;
   insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_failed',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'error',v_error));
   return s;
 end;
 select count(*) into v_remaining from public.automation_step_runs where instance_id=i.id and status not in ('succeeded','skipped','cancelled');
 if v_remaining=0 then
   update public.automation_runbook_instances set status='completed',completed_at=now(),updated_at=now() where id=i.id;
   insert into public.automation_events(event_key,instance_id,event_type,actor_id,metadata) values('complete:'||p_execution_key,i.id,'completed',p_actor_id,jsonb_build_object('runbook_key',r.runbook_key)) on conflict(event_key) do nothing;
 else
   update public.automation_step_runs sr set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
   where sr.id=(select sr2.id from public.automation_step_runs sr2 join public.automation_runbook_steps st2 on st2.id=sr2.step_id where sr2.instance_id=i.id and sr2.status='pending' order by st2.step_order limit 1)
     and not exists(select 1 from public.automation_step_runs prev join public.automation_runbook_steps ps on ps.id=prev.step_id where prev.instance_id=i.id and ps.step_order<d.step_order+1 and prev.status<>'succeeded');
 end if;
 return s;
end;$$;
revoke all on function public.execute_automation_step(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.execute_automation_step(uuid,uuid,text) to service_role;

create or replace function public.transition_automation_instance(p_instance_id uuid,p_actor_id uuid,p_target text,p_event_key text,p_reason text default null)
returns public.automation_runbook_instances language plpgsql security definer set search_path=''
as $$
declare i public.automation_runbook_instances;begin
 if p_target not in ('paused','active','cancelled') then raise exception 'invalid_target';end if;perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;
 if p_target='paused' and i.status<>'active' then raise exception 'instance_not_pausable';end if;
 if p_target='active' and i.status<>'paused' then raise exception 'instance_not_resumable';end if;
 if p_target='cancelled' and i.status not in ('planned','active','paused') then raise exception 'instance_not_cancellable';end if;
 update public.automation_runbook_instances set status=p_target,paused_at=case when p_target='paused' then now() when p_target='active' then null else paused_at end,cancelled_at=case when p_target='cancelled' then now() else cancelled_at end,updated_at=now() where id=i.id returning * into i;
 if p_target='cancelled' then update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=i.id and status in ('pending','ready','failed');end if;
 insert into public.automation_events(event_key,instance_id,event_type,actor_id,metadata) values(p_event_key,i.id,p_target,p_actor_id,jsonb_build_object('reason',p_reason));
 return i;
end;$$;
revoke all on function public.transition_automation_instance(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.transition_automation_instance(uuid,uuid,text,text,text) to service_role;
