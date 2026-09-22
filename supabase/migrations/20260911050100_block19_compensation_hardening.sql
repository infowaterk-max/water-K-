-- Block 19 compensation hardening.
-- Narrow adapter only: reuses the existing tenant-safe task and runbook transition authorities.

create or replace function public.compensate_block19_runbook_v1(
  p_instance_id uuid,
  p_runbook_instance_id uuid,
  p_actor_id uuid,
  p_event_key text
) returns public.automation_runbook_instances
language plpgsql
security definer
set search_path=''
as $$
declare
  v_instance public.automation_runbook_instances;
  v_step record;
begin
  if p_instance_id is null or p_runbook_instance_id is null or p_actor_id is null then
    raise exception 'BLOCK19_COMPENSATION_IDENTITY_REQUIRED';
  end if;
  if nullif(trim(p_event_key),'') is null or length(p_event_key)>180 then
    raise exception 'BLOCK19_COMPENSATION_EVENT_KEY_INVALID';
  end if;
  if not public.is_platform_operator(p_actor_id)
     and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor_id) then
    raise exception 'BLOCK19_COMPENSATION_PERMISSION_REQUIRED';
  end if;

  select * into v_instance
  from public.automation_runbook_instances
  where id=p_runbook_instance_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'BLOCK19_COMPENSATION_RUNBOOK_NOT_FOUND'; end if;
  if v_instance.status not in ('planned','active','paused') then
    raise exception 'BLOCK19_COMPENSATION_TERMINAL';
  end if;

  -- A Block 17 human_task can be waiting while the runbook remains active. Cancel its
  -- canonical Control Tower task first, then close the waiting step with explicit evidence.
  for v_step in
    select sr.id as step_run_id,(sr.result->>'control_task_id')::uuid as task_id
    from public.automation_step_runs sr
    where sr.instance_id=p_runbook_instance_id
      and sr.status='waiting'
      and sr.result ? 'control_task_id'
      and nullif(sr.result->>'control_task_id','') is not null
  loop
    perform public.transition_control_task_v2(
      p_instance_id,
      v_step.task_id,
      'cancelled',
      p_event_key||':task:'||v_step.task_id::text,
      p_actor_id,
      'Block 19 human override / compensation'
    );

    update public.automation_step_runs
    set status='cancelled',finished_at=coalesce(finished_at,now()),next_attempt_at=null,
        last_error='block19_human_override',updated_at=now()
    where id=v_step.step_run_id and instance_id=p_runbook_instance_id and status='waiting';

    insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata)
    values(
      p_instance_id::text||':'||p_event_key||':step:'||v_step.step_run_id::text,
      p_runbook_instance_id,
      v_step.step_run_id,
      'cancelled',
      p_actor_id,
      jsonb_build_object('authority','block19-compensation','reason','human_override')
    ) on conflict(event_key) do nothing;
  end loop;

  return public.transition_automation_instance_v2(
    p_instance_id,
    p_runbook_instance_id,
    p_actor_id,
    'cancelled',
    p_event_key||':runbook',
    'Block 19 human override / compensation'
  );
end;$$;

revoke all on function public.compensate_block19_runbook_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.compensate_block19_runbook_v1(uuid,uuid,uuid,text) to service_role;

comment on function public.compensate_block19_runbook_v1(uuid,uuid,uuid,text) is
'Block 19 tenant-safe compensation adapter. Cancels waiting canonical control tasks/steps and delegates runbook cancellation to transition_automation_instance_v2; no commerce-domain mutation authority.';
