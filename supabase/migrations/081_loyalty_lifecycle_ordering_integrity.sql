-- V11 audit hardening: make tier bonus refund/cancel-safe regardless of lifecycle call order
create or replace function public.apply_loyalty_tier_bonus_points()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;v_cutover timestamptz;begin
 select tier_bonus_cutover_at into v_cutover from public.loyalty_program_settings where singleton=true;
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
 select e.customer_id,
        'tier-bonus:'||e.order_id::text,
        'earn',
        greatest(1,round(e.points*(case p.value_tier when 'silver' then 0.10 when 'gold' then 0.25 when 'platinum' then 0.50 else 0 end))::integer),
        e.order_id,
        'Hűségszint alapján jóváírt extra pont',
        jsonb_build_object('base_event_key',e.event_key,'tier_at_bonus',p.value_tier,'base_points',e.points,'multiplier',case p.value_tier when 'silver' then 1.10 when 'gold' then 1.25 when 'platinum' then 1.50 else 1 end),
        now()
 from public.loyalty_ledger e
 join public.customer_value_profiles p on p.customer_id=e.customer_id
 join public.orders o on o.id=e.order_id
 where e.entry_type='earn'
   and e.event_key like 'order-earn:%'
   and e.order_id is not null
   and e.occurred_at>=v_cutover
   and p.value_tier in ('silver','gold','platinum')
   and o.status in ('paid','processing','shipped','completed')
   and not exists(select 1 from public.loyalty_ledger r where r.reverses_entry_id=e.id and r.entry_type='reversal')
   and not exists(
     select 1 from public.return_cases rc
     where rc.order_id=o.id
     group by rc.order_id
     having coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)>=o.total_gross_huf
   )
 on conflict(event_key) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.apply_loyalty_tier_bonus_points() from public,anon,authenticated;
grant execute on function public.apply_loyalty_tier_bonus_points() to service_role;

-- Count every milestone insert, not just the final statement, while keeping deterministic keys.
create or replace function public.plan_customer_lifecycle_milestones()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_total integer:=0;v_rows integer:=0;begin
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'first-order','first_order',jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier)
 from public.customer_value_profiles p where p.paid_orders>=1
 on conflict(customer_id,milestone_key) do nothing;
 get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'repeat-order','repeat_order',jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier)
 from public.customer_value_profiles p where p.paid_orders>=2
 on conflict(customer_id,milestone_key) do nothing;
 get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'high-value:'||p.value_tier,'high_value',jsonb_build_object('value_score',p.value_score,'value_tier',p.value_tier,'revenue_gross_huf',p.revenue_gross_huf)
 from public.customer_value_profiles p where p.value_tier in ('gold','platinum')
 on conflict(customer_id,milestone_key) do nothing;
 get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'at-risk:'||to_char(current_date,'YYYY-MM'),'at_risk',jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score)
 from public.customer_value_profiles p where p.lifecycle_segment='at_risk'
 on conflict(customer_id,milestone_key) do nothing;
 get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'winback:'||to_char(current_date,'YYYY-MM'),'winback',jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score)
 from public.customer_value_profiles p where p.lifecycle_segment in ('winback','dormant')
 on conflict(customer_id,milestone_key) do nothing;
 get diagnostics v_rows=row_count;v_total:=v_total+v_rows;
 return v_total;
end;$$;
revoke all on function public.plan_customer_lifecycle_milestones() from public,anon,authenticated;
grant execute on function public.plan_customer_lifecycle_milestones() to service_role;

-- Keep an intuitive sequence; the bonus function is independently eligibility-safe too.
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
 select public.refresh_customer_value_profiles() into v_profiles;
 select public.apply_loyalty_tier_bonus_points() into v_bonus;
 select public.reverse_loyalty_points_for_ineligible_orders() into v_reversed;
 select public.plan_customer_lifecycle_milestones() into v_milestones;
 select public.plan_loyalty_retention_opportunities() into v_opportunities;
 update public.loyalty_processing_runs set accrued_points_entries=v_accrued,reversed_points_entries=v_reversed,refreshed_profiles=v_profiles,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('accrue','refresh_profiles','tier_bonus','reverse','milestones','retention_opportunities'),'tier_bonus_entries',v_bonus,'milestones',v_milestones,'opportunity_upserts',v_opportunities) where id=v.id returning * into v;
 return v;
end;$$;
revoke all on function public.process_loyalty_lifecycle(text) from public,anon,authenticated;
grant execute on function public.process_loyalty_lifecycle(text) to service_role;
