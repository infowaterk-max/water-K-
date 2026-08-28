-- V10 audit fix: prevent stale/duplicate active auto-generated opportunities
create unique index if not exists commercial_opportunities_one_active_b2c_auto_idx
on public.commercial_opportunities(customer_id)
where channel='b2c' and kind in ('retention','winback') and status in ('open','in_progress') and customer_id is not null;

create unique index if not exists commercial_opportunities_one_active_b2c_guest_auto_idx
on public.commercial_opportunities(lower(customer_email))
where channel='b2c' and kind in ('retention','winback') and status in ('open','in_progress') and customer_id is null and customer_email is not null;

create unique index if not exists commercial_opportunities_one_active_b2b_reorder_idx
on public.commercial_opportunities(reseller_id)
where channel='b2b' and kind='reorder' and status in ('open','in_progress') and reseller_id is not null;

create or replace function public.plan_commercial_opportunities()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b2c integer := 0;
  v_b2b integer := 0;
begin
  -- Close B2C auto-opportunities that are no longer represented by an actionable V9 segment.
  update public.commercial_opportunities o
     set status='dismissed',closed_at=now(),updated_at=now(),
         source=o.source||jsonb_build_object('auto_closed_reason','segment_no_longer_actionable')
   where o.channel='b2c'
     and o.kind in ('retention','winback')
     and o.status in ('open','in_progress')
     and not exists (
       select 1
       from public.customer_commercial_metrics c
       where c.segment in ('at_risk','winback','dormant')
         and (
           (o.customer_id is not null and c.customer_id=o.customer_id)
           or
           (o.customer_id is null and o.customer_email is not null and c.email_key=lower(trim(o.customer_email)))
         )
     );

  -- Reconcile existing active B2C opportunities in place as customer segments change.
  update public.commercial_opportunities o
     set opportunity_key='b2c:'||c.customer_key||':active',
         customer_id=c.customer_id,
         customer_email=c.email_key,
         kind=case when c.segment in ('winback','dormant') then 'winback' else 'retention' end,
         priority_score=case when c.segment='at_risk' then 80 when c.segment='winback' then 90 when c.segment='dormant' then 70 else 50 end,
         expected_value_net_huf=round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),
         probability_percent=case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,
         due_at=now(),
         reason='V9 customer segment: '||c.segment,
         recommended_action=case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,
         source=jsonb_build_object(
           'segment',c.segment,
           'revenue_gross_huf',c.revenue_gross_huf,
           'aov_gross_huf',c.aov_gross_huf,
           'days_since_last_order',c.days_since_last_order,
           'value_basis','gross_div_1_27_estimate'
         ),
         updated_at=now()
    from public.customer_commercial_metrics c
   where o.channel='b2c'
     and o.kind in ('retention','winback')
     and o.status in ('open','in_progress')
     and c.segment in ('at_risk','winback','dormant')
     and (
       (o.customer_id is not null and c.customer_id=o.customer_id)
       or
       (o.customer_id is null and o.customer_email is not null and c.email_key=lower(trim(o.customer_email)))
     );

  insert into public.commercial_opportunities(
    opportunity_key,channel,customer_id,customer_email,kind,priority_score,
    expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source
  )
  select
    'b2c:'||c.customer_key||':active','b2c',c.customer_id,c.email_key,
    case when c.segment in ('winback','dormant') then 'winback' else 'retention' end,
    case when c.segment='at_risk' then 80 when c.segment='winback' then 90 when c.segment='dormant' then 70 else 50 end,
    round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),
    case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,
    now(),
    'V9 customer segment: '||c.segment,
    case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,
    jsonb_build_object(
      'segment',c.segment,
      'revenue_gross_huf',c.revenue_gross_huf,
      'aov_gross_huf',c.aov_gross_huf,
      'days_since_last_order',c.days_since_last_order,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.customer_commercial_metrics c
  where c.segment in ('at_risk','winback','dormant')
    and not exists (
      select 1
      from public.commercial_opportunities o
      where o.channel='b2c'
        and o.kind in ('retention','winback')
        and o.status in ('open','in_progress')
        and (
          (c.customer_id is not null and o.customer_id=c.customer_id)
          or
          (c.customer_id is null and o.customer_id is null and o.customer_email is not null and lower(trim(o.customer_email))=c.email_key)
        )
    )
  on conflict (opportunity_key) do nothing;
  get diagnostics v_b2c = row_count;

  -- Close B2B reorder opportunities that are no longer actionable.
  update public.commercial_opportunities o
     set status='dismissed',closed_at=now(),updated_at=now(),
         source=o.source||jsonb_build_object('auto_closed_reason','reorder_no_longer_actionable')
   where o.channel='b2b'
     and o.kind='reorder'
     and o.status in ('open','in_progress')
     and o.reseller_id is not null
     and not exists (
       select 1
       from public.reseller_growth_priorities r
       where r.customer_id=o.reseller_id
         and r.priority_band in ('critical','high','medium')
     );

  insert into public.commercial_opportunities(
    opportunity_key,channel,reseller_id,kind,priority_score,expected_value_net_huf,
    probability_percent,due_at,reason,recommended_action,source
  )
  select
    'b2b:'||r.customer_id::text||':reorder','b2b',r.customer_id,'reorder',r.priority_score,
    round(greatest(coalesce(r.estimated_reorder_value_gross_huf,0),0)::numeric/1.27,2),
    case when r.priority_band='critical' then 70 when r.priority_band='high' then 55 when r.priority_band='medium' then 35 else 20 end,
    case
      when r.avg_reorder_days is not null then r.last_order_at + make_interval(days => greatest(1,r.avg_reorder_days))
      else r.last_order_at
    end,
    'V9 reseller priority: '||r.priority_band,
    r.recommended_action,
    jsonb_build_object(
      'priority_band',r.priority_band,
      'reorder_signal',r.reorder_signal,
      'days_since_last_order',r.days_since_last_order,
      'avg_reorder_days',r.avg_reorder_days,
      'days_overdue',case when r.avg_reorder_days is null then null else greatest(0,r.days_since_last_order-r.avg_reorder_days) end,
      'inactivity_risk',r.inactivity_risk,
      'estimated_reorder_value_gross_huf',r.estimated_reorder_value_gross_huf,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.reseller_growth_priorities r
  where r.customer_id is not null
    and r.priority_band in ('critical','high','medium')
  on conflict (opportunity_key) do update set
    reseller_id=excluded.reseller_id,
    priority_score=excluded.priority_score,
    expected_value_net_huf=excluded.expected_value_net_huf,
    probability_percent=excluded.probability_percent,
    due_at=excluded.due_at,
    reason=excluded.reason,
    recommended_action=excluded.recommended_action,
    source=excluded.source,
    updated_at=now()
  where public.commercial_opportunities.status in ('open','in_progress');
  get diagnostics v_b2b = row_count;

  return jsonb_build_object('b2c_inserts',v_b2c,'b2b_upserts',v_b2b);
end;
$$;
revoke all on function public.plan_commercial_opportunities() from public,anon,authenticated;
grant execute on function public.plan_commercial_opportunities() to service_role;
