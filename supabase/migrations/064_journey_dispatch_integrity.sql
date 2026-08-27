-- V9 atomic dispatch from scheduled customer journey steps into the communication queue.
-- Marketing consent is enforced by enqueue_communication; failed consent blocks the step without duplicating jobs.
create or replace function public.dispatch_due_customer_journey_steps(p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  s record;
  v_job uuid;
  v_queued integer:=0;
  v_blocked integer:=0;
  v_seen integer:=0;
begin
  for s in
    select
      js.id, js.journey_id, js.step_key, js.purpose, js.template_key, js.scheduled_at,
      j.user_id, j.email, j.kind, j.source_key, j.metadata
    from public.customer_journey_steps js
    join public.customer_journeys j on j.id=js.journey_id
    where js.status='pending'
      and js.scheduled_at<=now()
      and j.status='active'
    order by js.scheduled_at,js.id
    for update of js skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  loop
    v_seen:=v_seen+1;
    begin
      select public.enqueue_communication(
        s.email,
        s.user_id,
        s.purpose,
        s.template_key,
        coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
          'journeyId',s.journey_id,
          'journeyKind',s.kind,
          'journeySourceKey',s.source_key,
          'journeyStep',s.step_key
        ),
        concat('journey:',s.journey_id,':',s.step_key),
        s.scheduled_at
      ) into v_job;

      update public.customer_journey_steps
      set status='queued',communication_job_id=v_job
      where id=s.id and status='pending';
      if found then v_queued:=v_queued+1; end if;
    exception when others then
      update public.customer_journey_steps
      set status='blocked'
      where id=s.id and status='pending';
      if found then v_blocked:=v_blocked+1; end if;
    end;
  end loop;

  update public.customer_journeys j
  set status='completed',completed_at=coalesce(j.completed_at,now()),updated_at=now()
  where j.status='active'
    and exists(select 1 from public.customer_journey_steps s where s.journey_id=j.id)
    and not exists(select 1 from public.customer_journey_steps s where s.journey_id=j.id and s.status='pending');

  return jsonb_build_object('seen',v_seen,'queued',v_queued,'blocked',v_blocked);
end;$$;

revoke all on function public.dispatch_due_customer_journey_steps(integer) from public,anon,authenticated;
grant execute on function public.dispatch_due_customer_journey_steps(integer) to service_role;
comment on function public.dispatch_due_customer_journey_steps(integer) is 'V9 idempotent, lock-safe journey-step dispatcher into the V8 communication queue.';
