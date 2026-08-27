-- V11 audit hardening: reconcile loyalty lifecycle signals into the V10 single-active B2C opportunity invariant
create or replace function public.plan_loyalty_retention_opportunities()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;v_inserted integer:=0;v_updated integer:=0;begin
  -- Close V11-sourced opportunities when the customer is no longer in an actionable lifecycle state.
  update public.commercial_opportunities o
     set status='dismissed',closed_at=now(),updated_at=now(),
         source=o.source||jsonb_build_object('auto_closed_reason','v11_lifecycle_no_longer_actionable')
   where o.channel='b2c' and o.kind in ('retention','winback') and o.status in ('open','in_progress')
     and coalesce(o.source->>'source','')='v11_loyalty'
     and o.customer_id is not null
     and not exists(
       select 1 from public.customer_value_profiles p
       where p.customer_id=o.customer_id and p.lifecycle_segment in ('at_risk','winback','dormant')
     );

  -- Reconcile the V11 signal into any already-active V9/V10 opportunity instead of creating a parallel record.
  update public.commercial_opportunities o
     set kind=case when p.lifecycle_segment in ('winback','dormant') then 'winback' else 'retention' end,
         priority_score=greatest(o.priority_score,case when p.value_tier='platinum' then 95 when p.value_tier='gold' then 85 when p.lifecycle_segment in ('winback','dormant') then 80 else 70 end),
         expected_value_net_huf=greatest(o.expected_value_net_huf,greatest(coalesce(p.aov_gross_huf,0),0)),
         probability_percent=greatest(o.probability_percent,case when p.value_tier='platinum' then 55 when p.value_tier='gold' then 45 when p.lifecycle_segment='at_risk' then 35 else 25 end),
         due_at=least(coalesce(o.due_at,now()),now()),
         reason='V11 lifecycle: '||p.lifecycle_segment||' · tier: '||p.value_tier,
         recommended_action=case when p.lifecycle_segment='at_risk' then 'Megtartási lehetőség felülvizsgálata' else 'Win-back lehetőség felülvizsgálata' end,
         source=o.source||jsonb_build_object('source','v11_loyalty','value_score',p.value_score,'value_tier',p.value_tier,'points_balance',coalesce(b.points_balance,0),'lifecycle_segment',p.lifecycle_segment),
         updated_at=now()
    from public.customer_value_profiles p
    left join public.loyalty_balances b on b.customer_id=p.customer_id
   where o.customer_id=p.customer_id
     and o.channel='b2c' and o.kind in ('retention','winback') and o.status in ('open','in_progress')
     and p.lifecycle_segment in ('at_risk','winback','dormant');
  get diagnostics v_updated=row_count;

  -- Create a V11 opportunity only when no active V9/V10 B2C retention/win-back opportunity exists.
  insert into public.commercial_opportunities(opportunity_key,channel,customer_id,customer_email,kind,status,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
  select
    'b2c:'||p.customer_id::text||':active',
    'b2c',p.customer_id,p.email_key,
    case when p.lifecycle_segment in ('winback','dormant') then 'winback' else 'retention' end,
    'open',
    case when p.value_tier='platinum' then 95 when p.value_tier='gold' then 85 when p.lifecycle_segment in ('winback','dormant') then 80 else 70 end,
    greatest(coalesce(p.aov_gross_huf,0),0),
    case when p.value_tier='platinum' then 55 when p.value_tier='gold' then 45 when p.lifecycle_segment='at_risk' then 35 else 25 end,
    now(),
    'V11 lifecycle: '||p.lifecycle_segment||' · tier: '||p.value_tier,
    case when p.lifecycle_segment='at_risk' then 'Megtartási lehetőség felülvizsgálata' else 'Win-back lehetőség felülvizsgálata' end,
    jsonb_build_object('source','v11_loyalty','value_score',p.value_score,'value_tier',p.value_tier,'points_balance',coalesce(b.points_balance,0),'lifecycle_segment',p.lifecycle_segment)
  from public.customer_value_profiles p
  left join public.loyalty_balances b on b.customer_id=p.customer_id
  where p.lifecycle_segment in ('at_risk','winback','dormant')
    and not exists(
      select 1 from public.commercial_opportunities o
      where o.customer_id=p.customer_id and o.channel='b2c' and o.kind in ('retention','winback') and o.status in ('open','in_progress')
    )
  on conflict(opportunity_key) do nothing;
  get diagnostics v_inserted=row_count;

  v_count:=v_updated+v_inserted;
  return v_count;
end;$$;
revoke all on function public.plan_loyalty_retention_opportunities() from public,anon,authenticated;
grant execute on function public.plan_loyalty_retention_opportunities() to service_role;
