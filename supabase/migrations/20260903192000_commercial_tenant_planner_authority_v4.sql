-- Tenant-authoritative commercial planner hardening.
-- Keep B2B opportunity generation aligned with customer_instance_roles and close stale tenant work items.

create or replace function public.plan_commercial_opportunities_v2(p_instance_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_b2c integer:=0;
  v_b2b integer:=0;
begin
  if p_instance_id is null
     or not exists(select 1 from public.webshop_instances w where w.id=p_instance_id) then
    raise exception 'COMMERCIAL_INSTANCE_REQUIRED';
  end if;

  -- Retire B2C auto-opportunities that are no longer represented by an actionable tenant segment.
  update public.commercial_opportunities o
     set status='dismissed',
         closed_at=now(),
         updated_at=now(),
         source=o.source||jsonb_build_object('auto_closed_reason','segment_no_longer_actionable')
   where o.instance_id=p_instance_id
     and o.channel='b2c'
     and o.kind in('retention','winback')
     and o.status in('open','in_progress')
     and not exists(
       select 1
       from public.customer_commercial_metrics c
       where c.instance_id=p_instance_id
         and c.segment in('at_risk','winback','dormant')
         and (
           (o.customer_id is not null and c.customer_id=o.customer_id)
           or
           (o.customer_id is null and o.customer_email is not null and c.email_key=lower(trim(o.customer_email)))
         )
     );

  -- Insert or reconcile the currently actionable tenant B2C opportunities.
  insert into public.commercial_opportunities(
    instance_id,opportunity_key,channel,customer_id,customer_email,kind,priority_score,
    expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source
  )
  select
    p_instance_id,
    'b2c:'||c.customer_key||':active',
    'b2c',
    c.customer_id,
    c.email_key,
    case when c.segment in('winback','dormant') then 'winback' else 'retention' end,
    case when c.segment='at_risk' then 80 when c.segment='winback' then 90 else 70 end,
    round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),
    case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,
    now(),
    'Customer segment: '||c.segment,
    case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,
    jsonb_build_object('segment',c.segment,'authority','tenant_customer_metrics')
  from public.customer_commercial_metrics c
  where c.instance_id=p_instance_id
    and c.segment in('at_risk','winback','dormant')
  on conflict(instance_id,opportunity_key) do update
     set customer_id=excluded.customer_id,
         customer_email=excluded.customer_email,
         kind=excluded.kind,
         priority_score=excluded.priority_score,
         expected_value_net_huf=excluded.expected_value_net_huf,
         probability_percent=excluded.probability_percent,
         due_at=excluded.due_at,
         reason=excluded.reason,
         recommended_action=excluded.recommended_action,
         source=excluded.source,
         closed_at=null,
         updated_at=now()
   where public.commercial_opportunities.status in('open','in_progress');
  get diagnostics v_b2c=row_count;

  -- Approval revocation or tenant-role changes immediately retire stale B2B reorder opportunities.
  update public.commercial_opportunities o
     set status='dismissed',
         closed_at=now(),
         updated_at=now(),
         source=o.source||jsonb_build_object(
           'auto_closed_reason','tenant_reseller_no_longer_actionable',
           'authority','customer_instance_roles'
         )
   where o.instance_id=p_instance_id
     and o.channel='b2b'
     and o.kind='reorder'
     and o.status in('open','in_progress')
     and o.reseller_id is not null
     and not exists(
       select 1
       from public.reseller_growth_priorities_v2 r
       where r.instance_id=p_instance_id
         and r.customer_id=o.reseller_id
         and r.priority_band in('critical','high','medium')
     );

  -- B2B opportunities are sourced exclusively from the tenant-authoritative reseller view.
  insert into public.commercial_opportunities(
    instance_id,opportunity_key,channel,reseller_id,kind,priority_score,expected_value_net_huf,
    probability_percent,due_at,reason,recommended_action,source
  )
  select
    p_instance_id,
    'b2b:'||r.customer_id::text||':reorder',
    'b2b',
    r.customer_id,
    'reorder',
    r.priority_score,
    round(greatest(coalesce(r.estimated_reorder_value_gross_huf,0),0)::numeric/1.27,2),
    case when r.priority_band='critical' then 70 when r.priority_band='high' then 55 else 35 end,
    coalesce(r.last_order_at,now()),
    'Reseller priority: '||r.priority_band,
    r.recommended_action,
    jsonb_build_object(
      'priority_band',r.priority_band,
      'reorder_signal',r.reorder_signal,
      'authority','customer_instance_roles',
      'source_view','reseller_growth_priorities_v2'
    )
  from public.reseller_growth_priorities_v2 r
  where r.instance_id=p_instance_id
    and r.customer_id is not null
    and r.priority_band in('critical','high','medium')
  on conflict(instance_id,opportunity_key) do update
     set reseller_id=excluded.reseller_id,
         priority_score=excluded.priority_score,
         expected_value_net_huf=excluded.expected_value_net_huf,
         probability_percent=excluded.probability_percent,
         due_at=excluded.due_at,
         reason=excluded.reason,
         recommended_action=excluded.recommended_action,
         source=excluded.source,
         closed_at=null,
         updated_at=now()
   where public.commercial_opportunities.status in('open','in_progress');
  get diagnostics v_b2b=row_count;

  return jsonb_build_object('b2c_inserts',v_b2c,'b2b_upserts',v_b2b);
end;
$$;

create or replace function public.plan_high_value_sales_tasks_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer:=0;
begin
  if p_instance_id is null
     or not exists(select 1 from public.webshop_instances w where w.id=p_instance_id) then
    raise exception 'COMMERCIAL_INSTANCE_REQUIRED';
  end if;

  -- Keep generated tasks in the same tenant and retire tasks whose opportunity is closed or no longer high value.
  update public.sales_tasks t
     set status='cancelled',
         outcome=coalesce(nullif(trim(t.outcome),''),
           'Automatikusan lezárva: a kereskedelmi lehetőség már nem aktív vagy nem igényel kiemelt kezelést.'),
         updated_at=now()
   where t.instance_id=p_instance_id
     and t.task_key like 'opportunity:%'
     and t.status in('open','in_progress')
     and not exists(
       select 1
       from public.commercial_opportunities o
       where o.id=t.opportunity_id
         and o.instance_id=p_instance_id
         and o.status in('open','in_progress')
         and (o.priority_score>=80 or o.expected_value_net_huf>=100000)
     );

  insert into public.sales_tasks(
    instance_id,opportunity_id,task_key,title,description,priority,due_at
  )
  select
    p_instance_id,
    o.id,
    'opportunity:'||o.id::text,
    case when o.channel='b2b' then 'Viszonteladói lehetőség kezelése' else 'Nagy értékű ügyféllehetőség kezelése' end,
    o.reason||coalesce(' · '||o.recommended_action,''),
    o.priority_score,
    coalesce(o.due_at,now())
  from public.commercial_opportunities o
  where o.instance_id=p_instance_id
    and o.status in('open','in_progress')
    and (o.priority_score>=80 or o.expected_value_net_huf>=100000)
  on conflict(instance_id,task_key) do update
     set opportunity_id=excluded.opportunity_id,
         title=excluded.title,
         priority=excluded.priority,
         due_at=excluded.due_at,
         description=excluded.description,
         updated_at=now()
   where public.sales_tasks.status in('open','in_progress');
  get diagnostics v_count=row_count;

  return v_count;
end;
$$;

-- The audited v3 wrapper calls these helpers as the function owner. Direct runtime execution remains denied.
revoke all on function public.plan_commercial_opportunities_v2(uuid) from public,anon,authenticated,service_role;
revoke all on function public.plan_high_value_sales_tasks_v2(uuid) from public,anon,authenticated,service_role;

-- Legacy global planners/read models must not be available to application service code.
revoke all on function public.plan_commercial_opportunities() from public,anon,authenticated,service_role;
revoke all on function public.plan_high_value_sales_tasks() from public,anon,authenticated,service_role;
revoke all on public.reseller_reorder_signals from public,anon,authenticated,service_role;
revoke all on public.reseller_growth_priorities from public,anon,authenticated,service_role;

comment on function public.plan_commercial_opportunities_v2(uuid)
is 'Internal tenant-authoritative opportunity planner. B2B decisions use customer_instance_roles through reseller_growth_priorities_v2; stale auto-opportunities are dismissed.';
comment on function public.plan_high_value_sales_tasks_v2(uuid)
is 'Internal tenant-scoped sales-task planner. Stale generated tasks are cancelled before high-value tasks are reconciled.';
