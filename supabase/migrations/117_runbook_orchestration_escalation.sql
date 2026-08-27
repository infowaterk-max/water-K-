-- V15: orchestration, SLA escalation, stale-source cancellation and health views.
create table if not exists public.automation_processing_runs(
 id uuid primary key default gen_random_uuid(),run_key text not null unique,started_at timestamptz not null default now(),completed_at timestamptz,
 planned jsonb not null default '{}'::jsonb,reconciled jsonb not null default '{}'::jsonb,metadata jsonb not null default '{}'::jsonb
);
alter table public.automation_processing_runs enable row level security;revoke all on public.automation_processing_runs from public,anon,authenticated;grant select,insert,update on public.automation_processing_runs to service_role;

create or replace function public.reconcile_automation_runbooks(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare i record;r public.automation_runbooks;v_cancelled integer:=0;v_failed integer:=0;v_escalated integer:=0;v_ready integer:=0;v_task uuid;begin
 for i in select ai.*,ca.status alert_status,ca.priority_score,ca.title alert_title,ap.status proposal_status
          from public.automation_runbook_instances ai join public.control_alerts ca on ca.id=ai.alert_id left join public.action_proposals ap on ap.id=ai.proposal_id
          where ai.status in ('planned','active','paused') loop
   select * into r from public.automation_runbooks where id=i.runbook_id;
   if i.alert_status not in ('open','acknowledged') or (r.requires_action_approval and coalesce(i.proposal_status,'') in ('rejected','expired','cancelled')) then
     update public.automation_runbook_instances set status='cancelled',cancelled_at=now(),updated_at=now() where id=i.id;
     update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=i.id and status in ('pending','ready','failed');
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('reconcile-cancel:'||p_run_key||':'||i.id::text,i.id,'cancelled',jsonb_build_object('reason','source_condition_closed_or_proposal_invalid')) on conflict(event_key) do nothing;
     v_cancelled:=v_cancelled+1;continue;
   end if;
   if i.failure_count>=r.max_failures then
     update public.automation_runbook_instances set status='failed',updated_at=now() where id=i.id;
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation-failed:'||i.id::text,i.alert_id,'open',greatest(90,i.priority_score),'Automatizálási hiba · '||i.alert_title,'Vizsgáld meg a runbook ismétlődő hibáit és csak igazolt ok után indíts újra.',now()+interval '2 hours',jsonb_build_object('source','v15_runbook_failure','instance_id',i.id))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),updated_at=now() returning id into v_task;
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('reconcile-failed:'||p_run_key||':'||i.id::text,i.id,'failed',jsonb_build_object('failure_count',i.failure_count,'max_failures',r.max_failures,'control_task_id',v_task)) on conflict(event_key) do nothing;
     v_failed:=v_failed+1;continue;
   end if;
   if i.deadline_at<=now() and i.escalation_level<5 then
     update public.automation_runbook_instances set escalation_level=least(5,escalation_level+1),updated_at=now() where id=i.id;
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation-overdue:'||i.id::text,i.alert_id,'open',least(100,greatest(80,i.priority_score)+i.escalation_level*3),'Lejárt automatizálási SLA · '||i.alert_title,'Ellenőrizd a lejárt runbookot és jelölj ki következő emberi lépést.',now()+interval '2 hours',jsonb_build_object('source','v15_runbook_escalation','instance_id',i.id,'escalation_level',i.escalation_level+1))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),due_at=least(public.control_tasks.due_at,excluded.due_at),updated_at=now() returning id into v_task;
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('escalate:'||p_run_key||':'||i.id::text||':'||(i.escalation_level+1)::text,i.id,'escalated',jsonb_build_object('level',i.escalation_level+1,'control_task_id',v_task)) on conflict(event_key) do nothing;
     v_escalated:=v_escalated+1;
   end if;
 end loop;
 update public.automation_step_runs sr set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
 where sr.status='failed' and sr.next_attempt_at<=now() and sr.attempt_count<(select s.max_attempts from public.automation_runbook_steps s where s.id=sr.step_id)
   and exists(select 1 from public.automation_runbook_instances i where i.id=sr.instance_id and i.status='active');
 get diagnostics v_ready=row_count;
 return jsonb_build_object('cancelled',v_cancelled,'failed',v_failed,'escalated',v_escalated,'retries_ready',v_ready);
end;$$;
revoke all on function public.reconcile_automation_runbooks(text) from public,anon,authenticated;grant execute on function public.reconcile_automation_runbooks(text) to service_role;

create or replace function public.process_automation_cycle(p_run_key text)
returns public.automation_processing_runs language plpgsql security definer set search_path=''
as $$
declare x public.automation_processing_runs;v_plan jsonb;v_rec jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-cycle:'||p_run_key,0));
 select * into x from public.automation_processing_runs where run_key=p_run_key;if found and x.completed_at is not null then return x;end if;
 if not found then insert into public.automation_processing_runs(run_key) values(p_run_key) returning * into x;end if;
 select public.plan_automation_runbooks(p_run_key) into v_plan;select public.reconcile_automation_runbooks(p_run_key) into v_rec;
 update public.automation_processing_runs set planned=v_plan,reconciled=v_rec,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('plan','reconcile')) where id=x.id returning * into x;return x;
end;$$;
revoke all on function public.process_automation_cycle(text) from public,anon,authenticated;grant execute on function public.process_automation_cycle(text) to service_role;

create or replace view public.automation_runbook_queue with(security_invoker=true) as
select i.id as instance_id,i.instance_key,i.status,i.escalation_level,i.failure_count,i.deadline_at,i.started_at,i.created_at,
 r.runbook_key,r.version as runbook_version,r.name as runbook_name,r.category,r.risk_class,r.requires_action_approval,r.max_failures,
 a.id as alert_id,a.title as alert_title,a.severity,a.priority_score,a.status as alert_status,i.proposal_id,p.status as proposal_status,
 count(sr.id) as total_steps,count(sr.id) filter(where sr.status='succeeded') as succeeded_steps,count(sr.id) filter(where sr.status='failed') as failed_steps,
 count(sr.id) filter(where sr.status in ('ready','running')) as executable_steps,
 round((extract(epoch from(now()-coalesce(i.started_at,i.created_at)))/3600)::numeric,1) as age_hours,
 case when i.deadline_at<now() and i.status in ('planned','active','paused') then true else false end as overdue
from public.automation_runbook_instances i join public.automation_runbooks r on r.id=i.runbook_id join public.control_alerts a on a.id=i.alert_id
left join public.action_proposals p on p.id=i.proposal_id left join public.automation_step_runs sr on sr.instance_id=i.id
group by i.id,r.id,a.id,p.id;
revoke all on public.automation_runbook_queue from public,anon,authenticated;grant select on public.automation_runbook_queue to service_role;

create or replace view public.automation_kpis with(security_invoker=true) as
select count(*) filter(where status='planned')::integer as planned,count(*) filter(where status='active')::integer as active,count(*) filter(where status='paused')::integer as paused,
 count(*) filter(where status='failed')::integer as failed,count(*) filter(where overdue)::integer as overdue,count(*) filter(where escalation_level>0)::integer as escalated,
 coalesce(sum(failed_steps),0)::integer as failed_steps,coalesce(avg(age_hours) filter(where status in ('planned','active','paused')),0)::numeric as avg_open_age_hours
from public.automation_runbook_queue;
revoke all on public.automation_kpis from public,anon,authenticated;grant select on public.automation_kpis to service_role;

create or replace view public.automation_health with(security_invoker=true) as
select c.global_paused,c.pause_reason,c.consecutive_failures,c.circuit_open_until,
 case when c.global_paused then 'paused' when c.circuit_open_until>now() then 'circuit_open' when c.consecutive_failures>=3 then 'degraded' else 'healthy' end as health_status,
 (select max(completed_at) from public.automation_processing_runs) as last_cycle_at
from public.automation_control c where c.singleton=true;
revoke all on public.automation_health from public,anon,authenticated;grant select on public.automation_health to service_role;
