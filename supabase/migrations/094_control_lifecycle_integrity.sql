-- V13: strict/idempotent alert and decision-task lifecycle.

alter table public.control_alert_events drop constraint if exists control_alert_events_event_type_check;
alter table public.control_alert_events add constraint control_alert_events_event_type_check
  check(event_type in ('detected','redetected','acknowledged','snoozed','reopened','resolved','dismissed','task_created','task_started','task_completed','task_cancelled'));

create or replace function public.transition_control_alert(
  p_alert_id uuid,
  p_target_status text,
  p_event_key text,
  p_actor_id uuid default null,
  p_snoozed_until timestamptz default null,
  p_note text default null
) returns public.control_alerts
language plpgsql security definer set search_path=''
as $$
declare
  a public.control_alerts;
  e public.control_alert_events;
  v_from text;
  v_event_type text;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  if p_target_status not in ('open','acknowledged','snoozed','resolved','dismissed') then raise exception 'unsupported_control_status'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-alert:'||p_alert_id::text,0));
  select * into a from public.control_alerts where id=p_alert_id for update;
  if not found then raise exception 'control_alert_not_found'; end if;

  select * into e from public.control_alert_events where event_key=p_event_key;
  if found then
    if e.alert_id<>p_alert_id or coalesce(e.to_status,'')<>p_target_status then raise exception 'event_key_conflict'; end if;
    return a;
  end if;

  v_from:=a.status;
  if p_target_status='open' and v_from<>'snoozed' then raise exception 'invalid_control_transition'; end if;
  if p_target_status='acknowledged' and v_from not in ('open','snoozed') then raise exception 'invalid_control_transition'; end if;
  if p_target_status='snoozed' and v_from not in ('open','acknowledged') then raise exception 'invalid_control_transition'; end if;
  if p_target_status in ('resolved','dismissed') and v_from not in ('open','acknowledged','snoozed') then raise exception 'invalid_control_transition'; end if;
  if p_target_status='snoozed' and (p_snoozed_until is null or p_snoozed_until<=now()) then raise exception 'future_snooze_required'; end if;

  v_event_type:=case p_target_status
    when 'open' then 'reopened'
    when 'acknowledged' then 'acknowledged'
    when 'snoozed' then 'snoozed'
    when 'resolved' then 'resolved'
    when 'dismissed' then 'dismissed'
  end;

  update public.control_alerts set
    status=p_target_status,
    acknowledged_at=case when p_target_status='acknowledged' then coalesce(acknowledged_at,now()) else acknowledged_at end,
    acknowledged_by=case when p_target_status='acknowledged' then p_actor_id else acknowledged_by end,
    snoozed_until=case when p_target_status='snoozed' then p_snoozed_until when p_target_status='open' then null else snoozed_until end,
    resolved_at=case when p_target_status='resolved' then coalesce(resolved_at,now()) when p_target_status='open' then null else resolved_at end,
    resolved_by=case when p_target_status='resolved' then p_actor_id when p_target_status='open' then null else resolved_by end,
    dismissed_at=case when p_target_status='dismissed' then coalesce(dismissed_at,now()) when p_target_status='open' then null else dismissed_at end,
    dismissed_by=case when p_target_status='dismissed' then p_actor_id when p_target_status='open' then null else dismissed_by end,
    updated_at=now()
  where id=p_alert_id returning * into a;

  insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,p_alert_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('note',nullif(trim(p_note),''),'snoozed_until',p_snoozed_until));

  if p_target_status in ('resolved','dismissed') then
    update public.control_tasks set status='cancelled',updated_at=now(),outcome=coalesce(outcome,'Alert lezárása miatt automatikusan lezárt kontrollfeladat')
    where alert_id=p_alert_id and status in ('open','in_progress');
  end if;
  return a;
end;$$;
revoke all on function public.transition_control_alert(uuid,text,text,uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.transition_control_alert(uuid,text,text,uuid,timestamptz,text) to service_role;

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
  a public.control_alerts;
  existing public.control_alert_events;
  v_from text;
  v_event_type text;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  if p_target_status not in ('in_progress','completed','cancelled') then raise exception 'unsupported_task_status'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-task:'||p_task_id::text,0));
  select * into t from public.control_tasks where id=p_task_id for update;
  if not found then raise exception 'control_task_not_found'; end if;
  select * into a from public.control_alerts where id=t.alert_id for update;
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
    started_at=case when p_target_status='in_progress' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_target_status='completed' then coalesce(completed_at,now()) else completed_at end,
    completed_by=case when p_target_status='completed' then p_actor_id else completed_by end,
    outcome=case when p_target_status in ('completed','cancelled') then nullif(trim(p_outcome),'') else outcome end,
    updated_at=now()
  where id=p_task_id returning * into t;

  v_event_type:=case p_target_status when 'in_progress' then 'task_started' when 'completed' then 'task_completed' else 'task_cancelled' end;
  insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,t.alert_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('task_id',t.id,'outcome',nullif(trim(p_outcome),'')));
  return t;
end;$$;
revoke all on function public.transition_control_task(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.transition_control_task(uuid,text,text,uuid,text) to service_role;
