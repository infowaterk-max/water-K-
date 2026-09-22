-- V13 final audit hardening: immutable identities/events and automatic task ownership.

create or replace function public.guard_control_alert_identity()
returns trigger language plpgsql security invoker set search_path=''
as $$begin
  if new.alert_key is distinct from old.alert_key then raise exception 'control_alert_key_immutable'; end if;
  return new;
end;$$;
revoke all on function public.guard_control_alert_identity() from public,anon,authenticated;
drop trigger if exists guard_control_alert_identity_trigger on public.control_alerts;
create trigger guard_control_alert_identity_trigger before update on public.control_alerts for each row execute function public.guard_control_alert_identity();

create or replace function public.guard_control_task_identity()
returns trigger language plpgsql security invoker set search_path=''
as $$begin
  if new.task_key is distinct from old.task_key or new.alert_id is distinct from old.alert_id then raise exception 'control_task_identity_immutable'; end if;
  return new;
end;$$;
revoke all on function public.guard_control_task_identity() from public,anon,authenticated;
drop trigger if exists guard_control_task_identity_trigger on public.control_tasks;
create trigger guard_control_task_identity_trigger before update on public.control_tasks for each row execute function public.guard_control_task_identity();

create or replace function public.prevent_control_event_mutation()
returns trigger language plpgsql security invoker set search_path=''
as $$begin raise exception 'control_alert_events_append_only'; end;$$;
revoke all on function public.prevent_control_event_mutation() from public,anon,authenticated;
drop trigger if exists prevent_control_event_update on public.control_alert_events;
drop trigger if exists prevent_control_event_delete on public.control_alert_events;
create trigger prevent_control_event_update before update on public.control_alert_events for each row execute function public.prevent_control_event_mutation();
create trigger prevent_control_event_delete before delete on public.control_alert_events for each row execute function public.prevent_control_event_mutation();

create or replace function public.transition_control_task(
  p_task_id uuid,
  p_target_status text,
  p_event_key text,
  p_actor_id uuid default null,
  p_outcome text default null
) returns public.control_tasks
language plpgsql security definer set search_path=''
as $$
declare
  t public.control_tasks;
  existing public.control_alert_events;
  v_from text;
  v_event_type text;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  if p_target_status not in ('in_progress','completed','cancelled') then raise exception 'unsupported_task_status'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-task:'||p_task_id::text,0));
  select * into t from public.control_tasks where id=p_task_id for update;
  if not found then raise exception 'control_task_not_found'; end if;
  perform 1 from public.control_alerts where id=t.alert_id for update;
  if not found then raise exception 'control_alert_not_found'; end if;

  select * into existing from public.control_alert_events where event_key=p_event_key;
  if found then
    if existing.alert_id<>t.alert_id then raise exception 'event_key_conflict'; end if;
    return t;
  end if;

  v_from:=t.status;
  if p_target_status='in_progress' and v_from<>'open' then raise exception 'invalid_task_transition'; end if;
  if p_target_status='completed' and v_from not in ('open','in_progress') then raise exception 'invalid_task_transition'; end if;
  if p_target_status='cancelled' and v_from not in ('open','in_progress') then raise exception 'invalid_task_transition'; end if;
  if p_target_status='completed' and nullif(trim(p_outcome),'') is null then raise exception 'task_outcome_required'; end if;

  update public.control_tasks set
    status=p_target_status,
    owner_user_id=case when p_target_status='in_progress' then coalesce(owner_user_id,p_actor_id) when p_target_status='completed' then coalesce(owner_user_id,p_actor_id) else owner_user_id end,
    started_at=case when p_target_status='in_progress' then coalesce(started_at,now()) when p_target_status='completed' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_target_status='completed' then coalesce(completed_at,now()) else completed_at end,
    completed_by=case when p_target_status='completed' then p_actor_id else completed_by end,
    outcome=case when p_target_status in ('completed','cancelled') then nullif(trim(p_outcome),'') else outcome end,
    updated_at=now()
  where id=p_task_id returning * into t;

  v_event_type:=case p_target_status when 'in_progress' then 'task_started' when 'completed' then 'task_completed' else 'task_cancelled' end;
  insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,t.alert_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('task_id',t.id,'owner_user_id',t.owner_user_id,'outcome',nullif(trim(p_outcome),'')));
  return t;
end;$$;
revoke all on function public.transition_control_task(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.transition_control_task(uuid,text,text,uuid,text) to service_role;

create or replace function public.plan_control_tasks(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare a record;t public.control_tasks;v_created integer:=0;v_reopened integer:=0;v_old_task_status text;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  for a in
    select * from public.control_alerts where status in ('open','acknowledged') and (severity in ('high','critical') or priority_score>=80)
    order by priority_score desc,last_detected_at
  loop
    select * into t from public.control_tasks where task_key='alert:'||a.id::text||':primary' for update;
    if not found then
      insert into public.control_tasks(task_key,alert_id,priority_score,title,recommended_action,due_at,metadata)
      values('alert:'||a.id::text||':primary',a.id,a.priority_score,'Kontrollfeladat · '||a.title,a.recommended_action,
        now()+case when a.severity='critical' then interval '2 hours' when a.severity='high' then interval '8 hours' else interval '24 hours' end,
        jsonb_build_object('source','v13_task_planner','created_run_key',p_run_key,'severity',a.severity)) returning * into t;
      insert into public.control_alert_events(event_key,alert_id,event_type,to_status,metadata)
      values('task-create:'||p_run_key||':'||t.id::text,a.id,'task_created','open',jsonb_build_object('task_id',t.id,'priority_score',t.priority_score)) on conflict(event_key) do nothing;
      v_created:=v_created+1;
    elsif t.status in ('completed','cancelled') and a.last_detected_at>coalesce(t.completed_at,t.updated_at) then
      v_old_task_status:=t.status;
      update public.control_tasks set status='open',priority_score=a.priority_score,recommended_action=a.recommended_action,
        due_at=now()+case when a.severity='critical' then interval '2 hours' when a.severity='high' then interval '8 hours' else interval '24 hours' end,
        owner_user_id=null,started_at=null,completed_at=null,completed_by=null,outcome=null,updated_at=now(),metadata=metadata||jsonb_build_object('reopened_run_key',p_run_key,'severity',a.severity)
      where id=t.id returning * into t;
      insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata)
      values('task-reopen:'||p_run_key||':'||t.id::text,a.id,'task_created',v_old_task_status,'open',jsonb_build_object('task_id',t.id,'reason','condition_still_active')) on conflict(event_key) do nothing;
      v_reopened:=v_reopened+1;
    elsif t.status in ('open','in_progress') then
      update public.control_tasks set priority_score=a.priority_score,recommended_action=a.recommended_action,updated_at=now() where id=t.id;
    end if;
  end loop;
  return jsonb_build_object('created',v_created,'reopened',v_reopened);
end;$$;
revoke all on function public.plan_control_tasks(text) from public,anon,authenticated;
grant execute on function public.plan_control_tasks(text) to service_role;
