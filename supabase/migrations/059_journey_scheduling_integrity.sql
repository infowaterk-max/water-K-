-- V9 atomic/idempotent journey step scheduling primitives.
create or replace function public.add_customer_journey_step(
  p_journey_id uuid,
  p_step_key text,
  p_purpose text,
  p_template_key text,
  p_scheduled_at timestamptz
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid;j public.customer_journeys%rowtype;begin
  select * into j from public.customer_journeys where id=p_journey_id for update;
  if not found then raise exception 'journey not found'; end if;
  if j.status<>'active' then raise exception 'journey is not active'; end if;
  if p_purpose not in ('transactional','marketing') then raise exception 'invalid purpose'; end if;
  insert into public.customer_journey_steps(journey_id,step_key,purpose,template_key,scheduled_at)
  values(p_journey_id,trim(p_step_key),p_purpose,trim(p_template_key),p_scheduled_at)
  on conflict(journey_id,step_key) do update set scheduled_at=excluded.scheduled_at
  returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.add_customer_journey_step(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.add_customer_journey_step(uuid,text,text,text,timestamptz) to service_role;

create or replace function public.queue_due_customer_journey_steps(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare s record;j public.customer_journeys%rowtype;v_job uuid;v_queued integer:=0;v_blocked integer:=0;begin
  for s in
    select id,journey_id,step_key,purpose,template_key,scheduled_at
    from public.customer_journey_steps
    where status='pending' and scheduled_at<=now()
    order by scheduled_at,id
    for update skip locked
    limit greatest(1,least(p_limit,200))
  loop
    select * into j from public.customer_journeys where id=s.journey_id for update;
    if not found or j.status<>'active' then
      update public.customer_journey_steps set status='cancelled' where id=s.id;
      continue;
    end if;
    begin
      v_job:=public.enqueue_communication(
        j.email,j.user_id,s.purpose,s.template_key,
        coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object('journeyId',j.id,'journeyKind',j.kind,'stepKey',s.step_key),
        concat('journey:',j.id,':',s.step_key),s.scheduled_at
      );
      update public.customer_journey_steps set status='queued',communication_job_id=v_job where id=s.id;
      v_queued:=v_queued+1;
    exception when others then
      update public.customer_journey_steps set status='blocked' where id=s.id;
      v_blocked:=v_blocked+1;
    end;
  end loop;
  return jsonb_build_object('queued',v_queued,'blocked',v_blocked);
end;$$;
revoke all on function public.queue_due_customer_journey_steps(integer) from public,anon,authenticated;
grant execute on function public.queue_due_customer_journey_steps(integer) to service_role;
