-- Reconcile stale tenant retention journeys before planning the next customer lifecycle pass.
-- Existing v2 callers keep the same RPC name; the return payload gains exact cancellation evidence.

create or replace function public.plan_customer_retention_journeys_v2(
  p_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  j record;
  m record;
  r record;
  v_journey uuid;
  v_created integer:=0;
  v_steps integer:=0;
  v_journeys_cancelled integer:=0;
  v_steps_cancelled integer:=0;
  v_jobs_cancelled integer:=0;
  v_rows integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  if not exists(
    select 1 from public.webshop_instances w
    where w.id=p_instance_id and w.status in('pilot','active')
  ) then raise exception 'inactive webshop'; end if;

  -- A retention journey becomes stale as soon as its customer no longer belongs to the segment
  -- that justified the journey. Reconcile both still-active journeys and completed journeys whose
  -- queued communication has not actually been sent yet.
  for j in
    select cj.id,cj.kind,cj.user_id,cj.email,cj.source_key,cj.metadata,cj.status
    from public.customer_journeys cj
    where cj.instance_id=p_instance_id
      and cj.kind in('replenishment','winback')
      and cj.status in('active','completed')
      and not exists(
        select 1
        from public.customer_commercial_metrics c
        where c.instance_id=p_instance_id
          and (
            (cj.user_id is not null and c.customer_id=cj.user_id)
            or
            (cj.user_id is null and c.customer_id is null and c.email_key=lower(trim(cj.email)))
          )
          and (
            (cj.kind='replenishment' and c.segment='at_risk')
            or
            (cj.kind='winback' and c.segment in('winback','dormant'))
          )
      )
      and (
        cj.status='active'
        or exists(
          select 1
          from public.customer_journey_steps js
          join public.communication_jobs q
            on q.id=js.communication_job_id and q.instance_id=js.instance_id
          where js.instance_id=p_instance_id
            and js.journey_id=cj.id
            and q.status in('pending','failed','processing')
        )
      )
    order by cj.id
  loop
    -- A processing message is already owned by a worker. Do not claim that it was cancelled;
    -- abort the planner transaction and let the next run reconcile after the worker finalizes it.
    if exists(
      select 1
      from public.customer_journey_steps js
      join public.communication_jobs q
        on q.id=js.communication_job_id and q.instance_id=js.instance_id
      where js.instance_id=p_instance_id
        and js.journey_id=j.id
        and q.status='processing'
    ) then
      raise exception 'RETENTION_JOURNEY_COMMUNICATION_IN_FLIGHT';
    end if;

    update public.communication_jobs q
    set status='cancelled',updated_at=now(),last_error='RETENTION_SEGMENT_NO_LONGER_ACTIONABLE'
    where q.instance_id=p_instance_id
      and q.status in('pending','failed')
      and exists(
        select 1 from public.customer_journey_steps js
        where js.instance_id=p_instance_id
          and js.journey_id=j.id
          and js.communication_job_id=q.id
      );
    get diagnostics v_rows=row_count;
    v_jobs_cancelled:=v_jobs_cancelled+v_rows;

    update public.customer_journey_steps js
    set status='cancelled',updated_at=now()
    where js.instance_id=p_instance_id
      and js.journey_id=j.id
      and (
        (js.status='pending' and js.communication_job_id is null)
        or
        (js.status in('pending','queued') and exists(
          select 1 from public.communication_jobs q
          where q.id=js.communication_job_id
            and q.instance_id=p_instance_id
            and q.status='cancelled'
        ))
      );
    get diagnostics v_rows=row_count;
    v_steps_cancelled:=v_steps_cancelled+v_rows;

    update public.customer_journeys
    set
      status='cancelled',
      completed_at=coalesce(completed_at,now()),
      updated_at=now(),
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'auto_closed_reason','retention_segment_no_longer_actionable',
        'auto_closed_at',now(),
        'authority','customer_commercial_metrics'
      )
    where id=j.id
      and instance_id=p_instance_id
      and status in('active','completed');
    if found then v_journeys_cancelled:=v_journeys_cancelled+1; end if;
  end loop;

  -- Plan the currently actionable retention journeys exactly as before.
  for m in
    select *
    from public.customer_commercial_metrics
    where instance_id=p_instance_id
      and segment in('at_risk','winback','dormant')
  loop
    select public.create_customer_journey_v2(
      p_instance_id,
      case when m.segment='at_risk'
        then 'replenishment'::public.customer_journey_kind
        else 'winback'::public.customer_journey_kind end,
      m.customer_id,
      m.email_key,
      concat(m.customer_key,':',m.segment),
      jsonb_build_object(
        'segment',m.segment,
        'paidOrders',m.paid_orders,
        'revenueGrossHuf',m.revenue_gross_huf,
        'lastOrderAt',m.last_order_at,
        'authority','customer_commercial_metrics'
      )
    ) into v_journey;

    v_created:=v_created+1;
    insert into public.customer_journey_steps(
      instance_id,journey_id,step_key,purpose,template_key,scheduled_at
    ) values(
      p_instance_id,
      v_journey,
      case when m.segment='at_risk' then 'replenishment-reminder' else 'winback-reminder' end,
      'marketing',
      case when m.segment='at_risk' then 'repeat_30d' else 'winback_90d' end,
      now()
    )
    on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  -- Abandoned-checkout planning is intentionally independent from retention segment reconciliation.
  for r in
    select id,user_id,email,recovery_token,last_seen_at,expires_at
    from public.checkout_recovery_intents
    where instance_id=p_instance_id
      and status='open'
      and expires_at>now()
      and last_seen_at<=now()-interval '2 hours'
  loop
    select public.create_customer_journey_v2(
      p_instance_id,
      'abandoned_checkout'::public.customer_journey_kind,
      r.user_id,
      r.email,
      r.id::text,
      jsonb_build_object(
        'checkoutRecoveryId',r.id,
        'recoveryToken',r.recovery_token,
        'lastSeenAt',r.last_seen_at,
        'expiresAt',r.expires_at
      )
    ) into v_journey;

    v_created:=v_created+1;
    insert into public.customer_journey_steps(
      instance_id,journey_id,step_key,purpose,template_key,scheduled_at
    ) values(
      p_instance_id,v_journey,'checkout-recovery','marketing','abandoned_checkout',now()
    )
    on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  update public.checkout_recovery_intents
  set status='expired',updated_at=now()
  where instance_id=p_instance_id
    and status='open'
    and expires_at<=now();

  return jsonb_build_object(
    'instanceId',p_instance_id,
    'journeysSeen',v_created,
    'stepsCreated',v_steps,
    'journeysCancelled',v_journeys_cancelled,
    'stepsCancelled',v_steps_cancelled,
    'jobsCancelled',v_jobs_cancelled
  );
end;
$$;

revoke all on function public.plan_customer_retention_journeys_v2(uuid)
from public,anon,authenticated;
grant execute on function public.plan_customer_retention_journeys_v2(uuid)
to service_role;

comment on function public.plan_customer_retention_journeys_v2(uuid)
is 'Tenant retention planner with stale-segment reconciliation. Cancels unsent retention journey work before planning current customer segments; fails closed on in-flight communication.';
