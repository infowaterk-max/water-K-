-- V9 retention and checkout recovery journey planner.
-- Creates idempotent journey records and scheduled steps; delivery still goes through the existing communication queue.
create or replace function public.plan_customer_retention_journeys()
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  m record;
  r record;
  v_journey uuid;
  v_created integer:=0;
  v_steps integer:=0;
begin
  for m in
    select * from public.customer_commercial_metrics
    where segment in ('at_risk','winback','dormant')
  loop
    select public.create_customer_journey(
      case when m.segment='at_risk' then 'replenishment'::public.customer_journey_kind else 'winback'::public.customer_journey_kind end,
      m.customer_id,
      m.email_key,
      concat(m.customer_key,':',m.segment),
      jsonb_build_object('segment',m.segment,'paidOrders',m.paid_orders,'revenueGrossHuf',m.revenue_gross_huf,'lastOrderAt',m.last_order_at)
    ) into v_journey;
    v_created:=v_created+1;
    insert into public.customer_journey_steps(journey_id,step_key,purpose,template_key,scheduled_at)
    values(
      v_journey,
      case when m.segment='at_risk' then 'replenishment-reminder' else 'winback-reminder' end,
      'marketing',
      case when m.segment='at_risk' then 'repeat_30d' else 'winback_90d' end,
      now()
    ) on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  for r in
    select id,user_id,email,recovery_token,last_seen_at,expires_at
    from public.checkout_recovery_intents
    where status='open'
      and expires_at>now()
      and last_seen_at<=now()-interval '2 hours'
  loop
    select public.create_customer_journey(
      'abandoned_checkout'::public.customer_journey_kind,
      r.user_id,
      r.email,
      r.id::text,
      jsonb_build_object('checkoutRecoveryId',r.id,'recoveryToken',r.recovery_token,'lastSeenAt',r.last_seen_at,'expiresAt',r.expires_at)
    ) into v_journey;
    v_created:=v_created+1;
    -- Uses the existing repeat_30d marketing template until a dedicated recovery template is activated.
    -- The journey metadata keeps this distinguishable and delivery remains consent-gated.
    insert into public.customer_journey_steps(journey_id,step_key,purpose,template_key,scheduled_at)
    values(v_journey,'checkout-recovery','marketing','repeat_30d',now())
    on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  update public.checkout_recovery_intents
  set status='expired',updated_at=now()
  where status='open' and expires_at<=now();

  return jsonb_build_object('journeysSeen',v_created,'stepsCreated',v_steps);
end;$$;

revoke all on function public.plan_customer_retention_journeys() from public,anon,authenticated;
grant execute on function public.plan_customer_retention_journeys() to service_role;
comment on function public.plan_customer_retention_journeys() is 'V9 idempotent planner for retention, winback and abandoned-checkout journey steps.';