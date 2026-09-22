-- Merchant-admin tenant closure: analytics, campaign, promotion and integration RPCs.

create or replace view public.v9_growth_dashboard_v2
with (security_invoker=true) as
select
  w.id as instance_id,
  (select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id) as paying_customers,
  (select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id and c.segment='vip') as vip_customers,
  (select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id and c.segment='at_risk') as at_risk_customers,
  (select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id and c.segment in('winback','dormant')) as winback_customers,
  (select coalesce(sum(c.revenue_gross_huf),0)::bigint from public.customer_commercial_metrics c where c.instance_id=w.id) as customer_lifetime_revenue_gross_huf,
  (select count(*)::integer from public.checkout_recovery_intents r where r.instance_id=w.id and r.status='open' and r.expires_at>now()) as open_checkout_recoveries,
  (select count(*)::integer from public.customer_journeys j where j.instance_id=w.id and j.status='active') as active_journeys,
  (select count(*)::integer from public.customer_journey_steps s where s.instance_id=w.id and s.status='pending' and s.scheduled_at<=now()) as due_journey_steps,
  (select count(*)::integer from public.reseller_reorder_signals r where r.instance_id=w.id and r.reorder_signal='overdue') as overdue_resellers,
  (select count(*)::integer from public.reseller_reorder_signals r where r.instance_id=w.id and r.reorder_signal='due_soon') as due_soon_resellers,
  now() as calculated_at
from public.webshop_instances w
where w.status in('pilot','active');

create or replace view public.v9_channel_retention_summary_v2
with (security_invoker=true) as
with paid as (
  select
    o.instance_id,
    o.id,
    o.customer_id,
    lower(trim(o.customer_email)) as email_key,
    o.created_at,
    o.total_gross_huf,
    case when p.role='reseller' and p.reseller_approved=true then 'reseller' else 'retail' end as channel
  from public.orders o
  left join public.profiles p on p.id=o.customer_id
  where o.status in('paid','processing','shipped','completed')
), customer_stats as (
  select
    instance_id,
    channel,
    coalesce(customer_id::text,email_key) as customer_key,
    count(*)::integer as orders_count,
    sum(total_gross_huf) as revenue_gross_huf,
    min(created_at) as first_order_at,
    max(created_at) as last_order_at
  from paid
  group by instance_id,channel,coalesce(customer_id::text,email_key)
)
select
  instance_id,
  channel,
  count(*)::integer as paying_customers,
  count(*) filter(where orders_count>=2)::integer as repeat_customers,
  round(100.0*count(*) filter(where orders_count>=2)/nullif(count(*),0),1) as repeat_rate_percent,
  sum(orders_count)::integer as paid_orders,
  sum(revenue_gross_huf)::bigint as revenue_gross_huf,
  round(sum(revenue_gross_huf)/nullif(sum(orders_count),0))::bigint as aov_gross_huf,
  round(sum(revenue_gross_huf)/nullif(count(*),0))::bigint as ltv_gross_huf,
  count(*) filter(where last_order_at>=now()-interval '90 days')::integer as active_90d_customers,
  count(*) filter(where last_order_at<now()-interval '90 days')::integer as inactive_90d_customers
from customer_stats
group by instance_id,channel;

create or replace view public.v9_monthly_customer_cohorts_v2
with (security_invoker=true) as
with paid as (
  select
    o.instance_id,
    coalesce(o.customer_id::text,lower(trim(o.customer_email))) as customer_key,
    date_trunc('month',o.created_at)::date as order_month,
    o.total_gross_huf
  from public.orders o
  where o.status in('paid','processing','shipped','completed')
), firsts as (
  select instance_id,customer_key,min(order_month) as cohort_month
  from paid
  group by instance_id,customer_key
), activity as (
  select
    p.instance_id,
    f.cohort_month,
    p.customer_key,
    p.order_month,
    (extract(year from age(p.order_month::timestamptz,f.cohort_month::timestamptz))*12
      +extract(month from age(p.order_month::timestamptz,f.cohort_month::timestamptz)))::integer as month_number,
    sum(p.total_gross_huf) as revenue_gross_huf
  from paid p
  join firsts f on f.instance_id=p.instance_id and f.customer_key=p.customer_key
  group by p.instance_id,f.cohort_month,p.customer_key,p.order_month
), sizes as (
  select instance_id,cohort_month,count(*)::integer as cohort_customers
  from firsts
  group by instance_id,cohort_month
)
select
  a.instance_id,
  a.cohort_month,
  a.month_number,
  s.cohort_customers,
  count(distinct a.customer_key)::integer as active_customers,
  round(100.0*count(distinct a.customer_key)/nullif(s.cohort_customers,0),1) as retention_percent,
  sum(a.revenue_gross_huf)::bigint as revenue_gross_huf
from activity a
join sizes s on s.instance_id=a.instance_id and s.cohort_month=a.cohort_month
group by a.instance_id,a.cohort_month,a.month_number,s.cohort_customers;

revoke all on public.v9_growth_dashboard_v2 from public,anon,authenticated;
revoke all on public.v9_channel_retention_summary_v2 from public,anon,authenticated;
revoke all on public.v9_monthly_customer_cohorts_v2 from public,anon,authenticated;
grant select on public.v9_growth_dashboard_v2 to service_role;
grant select on public.v9_channel_retention_summary_v2 to service_role;
grant select on public.v9_monthly_customer_cohorts_v2 to service_role;

create or replace function public.claim_integration_job_v2(
  p_instance_id uuid,
  p_id uuid
) returns table(id uuid,instance_id uuid,processing_token uuid)
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  return query
  update public.integration_jobs j
  set status='processing',
      processing_token=gen_random_uuid(),
      updated_at=now(),
      next_attempt_at=null
  where j.id=p_id
    and j.instance_id=p_instance_id
    and (
      j.status in('pending','failed','blocked')
      or (j.status='processing' and j.updated_at<=now()-interval '15 minutes')
    )
  returning j.id,j.instance_id,j.processing_token;
end;
$$;

revoke all on function public.claim_integration_job_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_integration_job_v2(uuid,uuid) to service_role;

create or replace function public.preview_promotion_margin_v2(
  p_instance_id uuid,
  p_variant_id uuid,
  p_discount_percent numeric,
  p_min_margin_percent numeric default 20
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v record;
  v_discount numeric;
  v_net_after numeric;
  v_margin numeric;
  v_margin_pct numeric;
  v_safe boolean;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  if p_discount_percent<0 or p_discount_percent>100 then raise exception 'invalid discount percent'; end if;
  if p_min_margin_percent<0 or p_min_margin_percent>100 then raise exception 'invalid minimum margin percent'; end if;

  select id,sku,label,net_price_huf,unit_cost_net_huf
  into v
  from public.product_variants
  where id=p_variant_id and instance_id=p_instance_id;

  if not found then raise exception 'variant not found in webshop'; end if;
  if v.unit_cost_net_huf is null then
    return jsonb_build_object('safe',false,'reason','missing_unit_cost','variantId',v.id,'sku',v.sku);
  end if;

  v_discount:=v.net_price_huf*(p_discount_percent/100);
  v_net_after:=greatest(0,v.net_price_huf-v_discount);
  v_margin:=v_net_after-v.unit_cost_net_huf;
  v_margin_pct:=case when v_net_after>0 then (v_margin/v_net_after)*100 else -100 end;
  v_safe:=v_margin>=0 and v_margin_pct>=p_min_margin_percent;

  return jsonb_build_object(
    'safe',v_safe,'variantId',v.id,'sku',v.sku,'label',v.label,
    'discountPercent',round(p_discount_percent,2),'netPriceBefore',v.net_price_huf,
    'netPriceAfter',round(v_net_after,2),'unitCostNet',v.unit_cost_net_huf,
    'marginNet',round(v_margin,2),'marginPercent',round(v_margin_pct,2),
    'minimumMarginPercent',round(p_min_margin_percent,2)
  );
end;
$$;

revoke all on function public.preview_promotion_margin_v2(uuid,uuid,numeric,numeric) from public,anon,authenticated;
grant execute on function public.preview_promotion_margin_v2(uuid,uuid,numeric,numeric) to service_role;

create or replace function public.admin_manage_marketing_campaign_v2(
  p_instance_id uuid,
  p_campaign_id uuid,
  p_actor uuid,
  p_action text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  c public.marketing_campaigns%rowtype;
  r record;
  v_job uuid;
  v_queued integer:=0;
begin
  if not public.can_manage_marketing(p_instance_id,p_actor)
     and not public.is_platform_operator(p_actor) then
    raise exception 'admin required';
  end if;

  select * into c
  from public.marketing_campaigns
  where id=p_campaign_id and instance_id=p_instance_id
  for update;

  if not found then raise exception 'campaign not found in webshop'; end if;

  if p_action='submit_review' then
    if c.status<>'draft' then raise exception 'invalid state'; end if;
    update public.marketing_campaigns
      set status='review',updated_at=now()
      where id=c.id and instance_id=p_instance_id;

  elsif p_action='approve' then
    if c.status<>'review' then raise exception 'invalid state'; end if;
    update public.marketing_campaigns
      set status='approved',approved_by=p_actor,approved_at=now(),updated_at=now()
      where id=c.id and instance_id=p_instance_id;

  elsif p_action='queue' then
    if c.status<>'approved' then raise exception 'invalid state'; end if;

    for r in
      select *
      from public.marketing_campaign_recipients
      where instance_id=p_instance_id
        and campaign_id=c.id
        and eligible=true
        and communication_job_id is null
    loop
      if public.has_marketing_consent_v2(p_instance_id,r.email,'email')
         and not public.is_communication_suppressed_v2(p_instance_id,r.email) then
        begin
          v_job:=public.enqueue_communication_v2(
            p_instance_id,
            r.email,
            r.user_id,
            'marketing',
            c.template_key,
            jsonb_build_object('customerName',coalesce(r.customer_name,''),'campaignId',c.id),
            concat('campaign:',p_instance_id,':',c.id,':',lower(r.email)),
            coalesce(c.scheduled_at,now())
          );
          update public.marketing_campaign_recipients
            set communication_job_id=v_job
            where id=r.id and instance_id=p_instance_id;
          v_queued:=v_queued+1;
        exception when others then
          null;
        end;
      else
        update public.marketing_campaign_recipients
          set eligible=false,exclusion_reason='ELIGIBILITY_CHANGED_BEFORE_QUEUE'
          where id=r.id and instance_id=p_instance_id;
      end if;
    end loop;

    update public.marketing_campaigns
      set status='queued',updated_at=now()
      where id=c.id and instance_id=p_instance_id;

  elsif p_action='cancel' then
    if c.status in('queued','completed','cancelled') then raise exception 'invalid state'; end if;
    update public.marketing_campaigns
      set status='cancelled',updated_at=now()
      where id=c.id and instance_id=p_instance_id;
  else
    raise exception 'invalid action';
  end if;

  insert into public.marketing_campaign_events(
    instance_id,campaign_id,actor_user_id,action,note
  ) values(
    p_instance_id,c.id,p_actor,p_action,left(p_note,1000)
  );

  return jsonb_build_object('ok',true,'queued',v_queued);
end;
$$;

revoke all on function public.admin_manage_marketing_campaign_v2(uuid,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.admin_manage_marketing_campaign_v2(uuid,uuid,uuid,text,text)
  to service_role;

-- No runtime path should keep using the global variants after this migration.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname=any(array[
        'claim_integration_job',
        'preview_promotion_margin',
        'admin_manage_marketing_campaign'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;


create or replace function public.create_customer_journey_v2(
  p_instance_id uuid,
  p_kind public.customer_journey_kind,
  p_user_id uuid,
  p_email text,
  p_source_key text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_id uuid;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  if length(trim(p_email))<5 or length(trim(p_source_key))<3 then raise exception 'invalid journey identity'; end if;
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then
    raise exception 'inactive webshop';
  end if;

  insert into public.customer_journeys(instance_id,kind,user_id,email,source_key,metadata)
  values(p_instance_id,p_kind,p_user_id,lower(trim(p_email)),trim(p_source_key),coalesce(p_metadata,'{}'::jsonb))
  on conflict(instance_id,kind,source_key)
  do update set updated_at=now(),metadata=excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_customer_journey_v2(uuid,public.customer_journey_kind,uuid,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.create_customer_journey_v2(uuid,public.customer_journey_kind,uuid,text,text,jsonb)
  to service_role;

create or replace function public.plan_customer_retention_journeys_v2(
  p_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  m record;
  r record;
  v_journey uuid;
  v_created integer:=0;
  v_steps integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

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
        'lastOrderAt',m.last_order_at
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

  return jsonb_build_object('journeysSeen',v_created,'stepsCreated',v_steps);
end;
$$;

revoke all on function public.plan_customer_retention_journeys_v2(uuid)
  from public,anon,authenticated;
grant execute on function public.plan_customer_retention_journeys_v2(uuid)
  to service_role;

create or replace function public.dispatch_due_customer_journey_steps_v2(
  p_instance_id uuid,
  p_limit integer default 50
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  s record;
  v_job uuid;
  v_queued integer:=0;
  v_blocked integer:=0;
  v_seen integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  for s in
    select
      js.id,js.journey_id,js.step_key,js.purpose,js.template_key,js.scheduled_at,
      j.user_id,j.email,j.kind,j.source_key,j.metadata
    from public.customer_journey_steps js
    join public.customer_journeys j
      on j.id=js.journey_id
     and j.instance_id=js.instance_id
    where js.instance_id=p_instance_id
      and j.instance_id=p_instance_id
      and js.status='pending'
      and js.scheduled_at<=now()
      and j.status='active'
    order by js.scheduled_at,js.id
    for update of js skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  loop
    v_seen:=v_seen+1;
    begin
      select public.enqueue_communication_v2(
        p_instance_id,
        s.email,
        s.user_id,
        s.purpose,
        s.template_key,
        coalesce(s.metadata,'{}'::jsonb)||jsonb_build_object(
          'journeyId',s.journey_id,
          'journeyKind',s.kind,
          'journeySourceKey',s.source_key,
          'journeyStep',s.step_key
        ),
        concat('journey:',p_instance_id,':',s.journey_id,':',s.step_key),
        s.scheduled_at
      ) into v_job;

      update public.customer_journey_steps
      set status='queued',communication_job_id=v_job
      where id=s.id
        and instance_id=p_instance_id
        and status='pending';
      if found then v_queued:=v_queued+1; end if;
    exception when others then
      update public.customer_journey_steps
      set status='blocked'
      where id=s.id
        and instance_id=p_instance_id
        and status='pending';
      if found then v_blocked:=v_blocked+1; end if;
    end;
  end loop;

  update public.customer_journeys j
  set status='completed',completed_at=coalesce(j.completed_at,now()),updated_at=now()
  where j.instance_id=p_instance_id
    and j.status='active'
    and exists(
      select 1 from public.customer_journey_steps s
      where s.instance_id=p_instance_id and s.journey_id=j.id
    )
    and not exists(
      select 1 from public.customer_journey_steps s
      where s.instance_id=p_instance_id and s.journey_id=j.id and s.status='pending'
    );

  return jsonb_build_object('seen',v_seen,'queued',v_queued,'blocked',v_blocked);
end;
$$;

revoke all on function public.dispatch_due_customer_journey_steps_v2(uuid,integer)
  from public,anon,authenticated;
grant execute on function public.dispatch_due_customer_journey_steps_v2(uuid,integer)
  to service_role;

do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname=any(array[
        'create_customer_journey',
        'plan_customer_retention_journeys',
        'dispatch_due_customer_journey_steps'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;
