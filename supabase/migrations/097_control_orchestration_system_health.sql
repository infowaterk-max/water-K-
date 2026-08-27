-- V13: system-health detector and idempotent control-tower orchestration.

create or replace function public.detect_system_control_alerts(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r record;a public.control_alerts;v_jobs integer:=0;v_webhooks integer:=0;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;

  for r in
    select * from public.integration_jobs
    where status in ('failed','blocked') or (status='processing' and updated_at<now()-interval '20 minutes')
    order by created_at
  loop
    select public.upsert_control_alert(
      'integration-job:'||r.id::text,
      'system','integration_job_failure',case when r.status='blocked' or r.attempt_count>=3 then 'critical' else 'high' end,
      least(100,75+(least(r.attempt_count,5)*5)),
      'Integrációs feldolgozási hiba · '||r.kind,
      r.provider||' integrációs feladat állapota: '||r.status||'.',
      'Ellenőrizd az integrációs naplót és a szolgáltatói választ; csak az ok feltárása után indíts újrapróbálást.',
      p_run_key,r.order_id,null,null,null,null,
      jsonb_build_object('integration_job_id',r.id,'kind',r.kind,'provider',r.provider,'status',r.status,'attempt_count',r.attempt_count,'last_error',r.last_error,'next_attempt_at',r.next_attempt_at,'updated_at',r.updated_at)
    ) into a;
    v_jobs:=v_jobs+1;
  end loop;

  for r in
    select * from public.webhook_events
    where status='failed' and created_at>=now()-interval '7 days'
    order by created_at desc
  loop
    select public.upsert_control_alert(
      'webhook:'||r.id::text,
      'system','webhook_processing_failure','high',80,
      'Webhook feldolgozási hiba · '||r.provider,
      'A webhook esemény feldolgozása sikertelen volt.',
      'Ellenőrizd az esemény naplóját, az idempotencia állapotot és a szolgáltatói payloadot.',
      p_run_key,null,null,null,null,null,
      jsonb_build_object('webhook_event_id',r.id,'provider',r.provider,'external_event_id',r.external_event_id,'signature_valid',r.signature_valid,'status',r.status,'error_message',r.error_message,'created_at',r.created_at)
    ) into a;
    v_webhooks:=v_webhooks+1;
  end loop;

  return jsonb_build_object('integration_jobs',v_jobs,'failed_webhooks',v_webhooks,'total',v_jobs+v_webhooks);
end;$$;
revoke all on function public.detect_system_control_alerts(text) from public,anon,authenticated;
grant execute on function public.detect_system_control_alerts(text) to service_role;

create or replace function public.process_control_tower_cycle(p_run_key text)
returns public.control_processing_runs language plpgsql security definer set search_path=''
as $$
declare
  run public.control_processing_runs;
  v_started timestamptz;
  v_domain jsonb;
  v_system jsonb;
  v_resolved integer;
  v_tasks jsonb;
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-cycle:'||p_run_key,0));
  select * into run from public.control_processing_runs where run_key=p_run_key for update;
  if found and run.completed_at is not null then return run; end if;
  if not found then
    insert into public.control_processing_runs(run_key) values(p_run_key) returning * into run;
  end if;
  v_started:=run.started_at;

  select public.detect_control_tower_alerts(p_run_key) into v_domain;
  select public.detect_system_control_alerts(p_run_key) into v_system;
  select public.resolve_stale_control_alerts(v_started,p_run_key) into v_resolved;
  select public.plan_control_tasks(p_run_key) into v_tasks;

  update public.control_processing_runs set
    detector_result=jsonb_build_object('domain',v_domain,'system',v_system,'auto_resolved',v_resolved),
    task_result=v_tasks,
    completed_at=now(),
    metadata=jsonb_build_object('safety','control_plane_only','sequence',jsonb_build_array('detect_domain','detect_system','resolve_stale','plan_human_tasks'))
  where id=run.id returning * into run;
  return run;
end;$$;
revoke all on function public.process_control_tower_cycle(text) from public,anon,authenticated;
grant execute on function public.process_control_tower_cycle(text) to service_role;

create or replace view public.control_system_health with(security_invoker=true) as
select
  count(*) filter(where category='system' and status in ('open','acknowledged','snoozed'))::integer as open_system_alerts,
  count(*) filter(where category='system' and severity='critical' and status in ('open','acknowledged','snoozed'))::integer as critical_system_alerts,
  (select count(*) from public.integration_jobs where status in ('failed','blocked'))::integer as failed_or_blocked_integration_jobs,
  (select count(*) from public.webhook_events where status='failed' and created_at>=now()-interval '7 days')::integer as failed_webhooks_7d,
  (select max(completed_at) from public.control_processing_runs) as last_control_cycle_at;
revoke all on public.control_system_health from public,anon,authenticated;
grant select on public.control_system_health to service_role;
