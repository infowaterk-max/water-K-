-- V11: tier bonus earning + lifecycle milestones + controlled retention/win-back opportunities
create table if not exists public.customer_lifecycle_milestones(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id) on delete restrict,
 milestone_key text not null,
 milestone_type text not null check (milestone_type in ('first_order','repeat_order','high_value','at_risk','winback')),
 source_order_id uuid references public.orders(id) on delete restrict,
 source jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(customer_id,milestone_key)
);
create index if not exists customer_lifecycle_milestones_customer_idx on public.customer_lifecycle_milestones(customer_id,occurred_at desc);
alter table public.customer_lifecycle_milestones enable row level security;
revoke all on public.customer_lifecycle_milestones from anon,authenticated;
grant all on public.customer_lifecycle_milestones to service_role;

create or replace function public.apply_loyalty_tier_bonus_points()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
 select e.customer_id,
        'tier-bonus:'||e.order_id::text||':'||p.value_tier,
        'earn',
        greatest(1,round(e.points*(case p.value_tier when 'silver' then 0.10 when 'gold' then 0.25 when 'platinum' then 0.50 else 0 end))::integer),
        e.order_id,
        'Hűségszint alapján jóváírt extra pont',
        jsonb_build_object('base_event_key',e.event_key,'tier',p.value_tier,'base_points',e.points,'multiplier',case p.value_tier when 'silver' then 1.10 when 'gold' then 1.25 when 'platinum' then 1.50 else 1 end),
        now()
 from public.loyalty_ledger e
 join public.customer_value_profiles p on p.customer_id=e.customer_id
 where e.entry_type='earn'
   and e.event_key like 'order-earn:%'
   and e.order_id is not null
   and p.value_tier in ('silver','gold','platinum')
   and not exists(select 1 from public.loyalty_ledger x where x.event_key='tier-bonus:'||e.order_id::text||':'||p.value_tier)
 on conflict(event_key) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.apply_loyalty_tier_bonus_points() from public,anon,authenticated;
grant execute on function public.apply_loyalty_tier_bonus_points() to service_role;

create or replace function public.plan_customer_lifecycle_milestones()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'first-order','first_order',jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier)
 from public.customer_value_profiles p where p.paid_orders>=1
 on conflict(customer_id,milestone_key) do nothing;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'repeat-order','repeat_order',jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier)
 from public.customer_value_profiles p where p.paid_orders>=2
 on conflict(customer_id,milestone_key) do nothing;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'high-value:'||p.value_tier,'high_value',jsonb_build_object('value_score',p.value_score,'value_tier',p.value_tier,'revenue_gross_huf',p.revenue_gross_huf)
 from public.customer_value_profiles p where p.value_tier in ('gold','platinum')
 on conflict(customer_id,milestone_key) do nothing;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'at-risk:'||to_char(current_date,'YYYY-MM'),'at_risk',jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score)
 from public.customer_value_profiles p where p.lifecycle_segment='at_risk'
 on conflict(customer_id,milestone_key) do nothing;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'winback:'||to_char(current_date,'YYYY-MM'),'winback',jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score)
 from public.customer_value_profiles p where p.lifecycle_segment in ('winback','dormant')
 on conflict(customer_id,milestone_key) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.plan_customer_lifecycle_milestones() from public,anon,authenticated;
grant execute on function public.plan_customer_lifecycle_milestones() to service_role;

create or replace function public.plan_loyalty_retention_opportunities()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
 insert into public.commercial_opportunities(opportunity_key,channel,customer_id,customer_email,kind,status,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
 select
   'loyalty:'||p.customer_id::text||':'||p.lifecycle_segment,
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
 on conflict(opportunity_key) do update set
   priority_score=excluded.priority_score,expected_value_net_huf=excluded.expected_value_net_huf,probability_percent=excluded.probability_percent,due_at=excluded.due_at,reason=excluded.reason,recommended_action=excluded.recommended_action,source=excluded.source,updated_at=now()
 where public.commercial_opportunities.status in ('open','in_progress');
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.plan_loyalty_retention_opportunities() from public,anon,authenticated;
grant execute on function public.plan_loyalty_retention_opportunities() to service_role;

create or replace function public.process_loyalty_lifecycle(p_run_key text)
returns public.loyalty_processing_runs
language plpgsql security definer set search_path=''
as $$
declare v public.loyalty_processing_runs;v_accrued integer:=0;v_reversed integer:=0;v_profiles integer:=0;v_bonus integer:=0;v_milestones integer:=0;v_opportunities integer:=0;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'A futási kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('loyalty-lifecycle:'||p_run_key,0));
 select * into v from public.loyalty_processing_runs where run_key=p_run_key;
 if found and v.completed_at is not null then return v; end if;
 if not found then insert into public.loyalty_processing_runs(run_key) values(p_run_key) returning * into v; end if;
 select public.accrue_loyalty_points_from_paid_orders() into v_accrued;
 select public.reverse_loyalty_points_for_ineligible_orders() into v_reversed;
 select public.refresh_customer_value_profiles() into v_profiles;
 select public.apply_loyalty_tier_bonus_points() into v_bonus;
 select public.plan_customer_lifecycle_milestones() into v_milestones;
 select public.plan_loyalty_retention_opportunities() into v_opportunities;
 update public.loyalty_processing_runs set accrued_points_entries=v_accrued,reversed_points_entries=v_reversed,refreshed_profiles=v_profiles,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('accrue','reverse','refresh_profiles','tier_bonus','milestones','retention_opportunities'),'tier_bonus_entries',v_bonus,'milestones',v_milestones,'opportunity_upserts',v_opportunities) where id=v.id returning * into v;
 return v;
end;$$;
revoke all on function public.process_loyalty_lifecycle(text) from public,anon,authenticated;
grant execute on function public.process_loyalty_lifecycle(text) to service_role;
