-- V13: human decision-task planner and executive control read models.

create or replace function public.plan_control_tasks(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare a record;t public.control_tasks;v_created integer:=0;v_reopened integer:=0;v_rowcount integer;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  for a in
    select * from public.control_alerts
    where status in ('open','acknowledged') and (severity in ('high','critical') or priority_score>=80)
    order by priority_score desc,last_detected_at
  loop
    select * into t from public.control_tasks where task_key='alert:'||a.id::text||':primary' for update;
    if not found then
      insert into public.control_tasks(task_key,alert_id,priority_score,title,recommended_action,due_at,metadata)
      values('alert:'||a.id::text||':primary',a.id,a.priority_score,'Kontrollfeladat · '||a.title,a.recommended_action,
        now()+case when a.severity='critical' then interval '2 hours' when a.severity='high' then interval '8 hours' else interval '24 hours' end,
        jsonb_build_object('source','v13_task_planner','created_run_key',p_run_key,'severity',a.severity))
      returning * into t;
      insert into public.control_alert_events(event_key,alert_id,event_type,to_status,metadata)
      values('task-create:'||p_run_key||':'||t.id::text,a.id,'task_created','open',jsonb_build_object('task_id',t.id,'priority_score',t.priority_score))
      on conflict(event_key) do nothing;
      v_created:=v_created+1;
    elsif t.status in ('completed','cancelled') and a.last_detected_at>coalesce(t.completed_at,t.updated_at) then
      update public.control_tasks set status='open',priority_score=a.priority_score,recommended_action=a.recommended_action,
        due_at=now()+case when a.severity='critical' then interval '2 hours' when a.severity='high' then interval '8 hours' else interval '24 hours' end,
        started_at=null,completed_at=null,completed_by=null,outcome=null,updated_at=now(),metadata=metadata||jsonb_build_object('reopened_run_key',p_run_key,'severity',a.severity)
      where id=t.id returning * into t;
      insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata)
      values('task-reopen:'||p_run_key||':'||t.id::text,a.id,'task_created','completed','open',jsonb_build_object('task_id',t.id,'reason','condition_still_active'))
      on conflict(event_key) do nothing;
      v_reopened:=v_reopened+1;
    elsif t.status in ('open','in_progress') then
      update public.control_tasks set priority_score=a.priority_score,recommended_action=a.recommended_action,updated_at=now() where id=t.id;
    end if;
  end loop;
  return jsonb_build_object('created',v_created,'reopened',v_reopened);
end;$$;
revoke all on function public.plan_control_tasks(text) from public,anon,authenticated;
grant execute on function public.plan_control_tasks(text) to service_role;

create or replace view public.control_tower_queue with(security_invoker=true) as
select a.id as alert_id,a.alert_key,a.category,a.alert_type,a.severity,a.priority_score,a.status,a.title,a.description,a.recommended_action,
       a.order_id,a.customer_id,a.reseller_id,a.variant_id,a.opportunity_id,a.evidence,a.occurrence_count,a.detected_at,a.last_detected_at,a.snoozed_until,
       round((extract(epoch from(now()-a.detected_at))/3600)::numeric,1) as age_hours,
       t.id as task_id,t.status as task_status,t.owner_user_id,t.due_at as task_due_at,t.outcome as task_outcome,
       case when t.status in ('open','in_progress') and t.due_at<now() then true else false end as task_overdue
from public.control_alerts a
left join public.control_tasks t on t.alert_id=a.id and t.task_key='alert:'||a.id::text||':primary'
where a.status in ('open','acknowledged','snoozed');
revoke all on public.control_tower_queue from public,anon,authenticated;
grant select on public.control_tower_queue to service_role;

create or replace view public.control_tower_kpis with(security_invoker=true) as
with q as(select * from public.control_tower_queue), x as(
 select
  count(*)::integer as open_alerts,
  count(*) filter(where severity='critical')::integer as critical_alerts,
  count(*) filter(where severity='high')::integer as high_alerts,
  count(*) filter(where age_hours>=24)::integer as over_24h_alerts,
  count(*) filter(where task_overdue)::integer as overdue_tasks,
  count(*) filter(where category='operations')::integer as operations_alerts,
  count(*) filter(where category='inventory')::integer as inventory_alerts,
  count(*) filter(where category='commercial')::integer as commercial_alerts,
  count(*) filter(where category='service')::integer as service_alerts,
  coalesce(sum((evidence->>'expected_value_net_huf')::numeric) filter(where category='commercial' and evidence ? 'expected_value_net_huf'),0) as commercial_value_at_risk_net_huf,
  coalesce(avg(age_hours),0) as avg_alert_age_hours
 from q
)
select x.*,
 greatest(0,least(100,100-(critical_alerts*15)-(high_alerts*7)-(overdue_tasks*5)-(over_24h_alerts*2)))::integer as control_health_score
from x;
revoke all on public.control_tower_kpis from public,anon,authenticated;
grant select on public.control_tower_kpis to service_role;

create or replace view public.control_tower_category_summary with(security_invoker=true) as
select category,severity,count(*)::integer as alert_count,max(priority_score)::integer as max_priority,
       round(avg(extract(epoch from(now()-detected_at))/3600)::numeric,1) as avg_age_hours
from public.control_alerts
where status in ('open','acknowledged','snoozed')
group by category,severity;
revoke all on public.control_tower_category_summary from public,anon,authenticated;
grant select on public.control_tower_category_summary to service_role;
