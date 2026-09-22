-- Roadmap Block 3: merchant-configurable loyalty program with safe expiry.
-- Existing loyalty programs stay enabled; new webshop instances default to loyalty off.

alter table public.loyalty_program_settings add column if not exists enabled boolean;
alter table public.loyalty_program_settings add column if not exists accrual_enabled boolean;
alter table public.loyalty_program_settings add column if not exists points_expire_days integer;

update public.loyalty_program_settings
set enabled=true
where enabled is null;

update public.loyalty_program_settings
set accrual_enabled=true
where accrual_enabled is null;

alter table public.loyalty_program_settings alter column enabled set default false;
alter table public.loyalty_program_settings alter column enabled set not null;
alter table public.loyalty_program_settings alter column accrual_enabled set default false;
alter table public.loyalty_program_settings alter column accrual_enabled set not null;

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conrelid='public.loyalty_program_settings'::regclass
      and conname='loyalty_program_settings_expiry_days_check'
  ) then
    alter table public.loyalty_program_settings
      add constraint loyalty_program_settings_expiry_days_check
      check(points_expire_days is null or points_expire_days between 1 and 3650);
  end if;
end;
$$;

comment on column public.loyalty_program_settings.enabled
is 'Merchant-controlled loyalty program switch. New programs default off.';
comment on column public.loyalty_program_settings.accrual_enabled
is 'Automatic paid-order point accrual switch. Effective only when the loyalty program is enabled.';
comment on column public.loyalty_program_settings.points_expire_days
is 'Point lifetime in days. NULL means points never expire.';

create or replace function public.merchant_update_loyalty_program_settings_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_enabled boolean,
  p_accrual_enabled boolean,
  p_points_expire_days integer default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if p_instance_id is null or p_actor_user_id is null then
    raise exception 'LOYALTY_SETTINGS_IDENTITY_REQUIRED';
  end if;
  if p_enabled is null or p_accrual_enabled is null then
    raise exception 'LOYALTY_SETTINGS_BOOLEAN_REQUIRED';
  end if;
  if p_points_expire_days is not null and (p_points_expire_days<1 or p_points_expire_days>3650) then
    raise exception 'LOYALTY_EXPIRY_DAYS_INVALID';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id and status in('pilot','active')
  for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if not exists(
    select 1 from public.role_bindings rb
    where rb.organization_id=v_org
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.user_id=p_actor_user_id
      and rb.revoked_at is null
      and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
      and rb.role_code in('owner','admin')
  ) and not exists(
    select 1 from public.platform_operators po
    where po.user_id=p_actor_user_id and po.role in('owner','admin','operator')
  ) then
    raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';
  end if;

  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  select jsonb_build_object(
    'enabled',s.enabled,
    'accrualEnabled',s.accrual_enabled,
    'pointsExpireDays',s.points_expire_days
  )
  into v_before
  from public.loyalty_program_settings s
  where s.instance_id=p_instance_id
  for update;

  update public.loyalty_program_settings
  set enabled=p_enabled,
      accrual_enabled=p_accrual_enabled,
      points_expire_days=p_points_expire_days,
      updated_at=now()
  where instance_id=p_instance_id;

  if not found then raise exception 'LOYALTY_SETTINGS_UPDATE_FAILED'; end if;

  v_after:=jsonb_build_object(
    'enabled',p_enabled,
    'accrualEnabled',p_accrual_enabled,
    'pointsExpireDays',p_points_expire_days
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'loyalty.program_settings_updated','loyalty_program_settings',
    p_instance_id::text,v_org,p_instance_id,
    'Hűségprogram beállításai módosítva',
    v_before,v_after,
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_update_loyalty_program_settings_v1')
  );

  return jsonb_build_object(
    'instanceId',p_instance_id,
    'enabled',p_enabled,
    'accrualEnabled',p_accrual_enabled,
    'pointsExpireDays',p_points_expire_days
  );
end;
$$;

revoke all on function public.merchant_update_loyalty_program_settings_v1(uuid,uuid,boolean,boolean,integer)
from public,anon,authenticated;
grant execute on function public.merchant_update_loyalty_program_settings_v1(uuid,uuid,boolean,boolean,integer)
to service_role;

create or replace function public.accrue_loyalty_points_from_paid_orders_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer:=0;
  v_enabled boolean:=false;
  v_accrual_enabled boolean:=false;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  select s.enabled,s.accrual_enabled into v_enabled,v_accrual_enabled
  from public.loyalty_program_settings s
  where s.instance_id=p_instance_id;
  if not coalesce(v_enabled,false) or not coalesce(v_accrual_enabled,false) then return 0; end if;

  insert into public.loyalty_ledger(
    instance_id,customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at
  )
  select
    p_instance_id,o.customer_id,'order-earn:'||o.id::text,'earn',
    least(1000,greatest(1,floor(o.total_gross_huf/1000.0)::integer)),
    o.id,'Fizetett rendelés után jóváírt hűségpont',
    jsonb_build_object(
      'order_total_gross_huf',o.total_gross_huf,
      'rule','1_point_per_1000_huf_gross',
      'cap',1000
    ),
    o.created_at
  from public.orders o
  where o.instance_id=p_instance_id
    and o.customer_id is not null
    and o.status in('paid','processing','shipped','completed')
    and o.total_gross_huf>0
  on conflict(instance_id,event_key) do nothing;

  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.apply_loyalty_tier_bonus_points_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer:=0;
  v_cutover timestamptz;
  v_enabled boolean:=false;
  v_accrual_enabled boolean:=false;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  select s.tier_bonus_cutover_at,s.enabled,s.accrual_enabled
  into v_cutover,v_enabled,v_accrual_enabled
  from public.loyalty_program_settings s
  where s.instance_id=p_instance_id;
  if not found or v_cutover is null then raise exception 'LOYALTY_PROGRAM_SETTINGS_MISSING'; end if;
  if not coalesce(v_enabled,false) or not coalesce(v_accrual_enabled,false) then return 0; end if;

  insert into public.loyalty_ledger(
    instance_id,customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at
  )
  select
    p_instance_id,
    e.customer_id,
    'tier-bonus:'||e.order_id::text,
    'earn',
    greatest(1,round(e.points*(
      case p.value_tier when 'silver' then 0.10 when 'gold' then 0.25 when 'platinum' then 0.50 else 0 end
    ))::integer),
    e.order_id,
    'Hűségszint alapján jóváírt extra pont',
    jsonb_build_object(
      'base_event_key',e.event_key,
      'tier_at_bonus',p.value_tier,
      'base_points',e.points,
      'multiplier',case p.value_tier when 'silver' then 1.10 when 'gold' then 1.25 when 'platinum' then 1.50 else 1 end
    ),
    now()
  from public.loyalty_ledger e
  join public.customer_value_profiles p
    on p.instance_id=p_instance_id and p.customer_id=e.customer_id
  join public.orders o
    on o.instance_id=p_instance_id and o.id=e.order_id
  where e.instance_id=p_instance_id
    and e.entry_type='earn'
    and e.event_key like 'order-earn:%'
    and e.order_id is not null
    and e.occurred_at>=v_cutover
    and p.value_tier in('silver','gold','platinum')
    and o.status in('paid','processing','shipped','completed')
    and not exists(
      select 1 from public.loyalty_ledger r
      where r.instance_id=p_instance_id
        and r.reverses_entry_id=e.id
        and r.entry_type='reversal'
    )
    and not exists(
      select 1 from public.return_cases rc
      where rc.instance_id=p_instance_id and rc.order_id=o.id
      group by rc.order_id
      having coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)>=o.total_gross_huf
    )
  on conflict(instance_id,event_key) do nothing;

  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.expire_loyalty_points_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer:=0;
  v_enabled boolean:=false;
  v_days integer;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  select s.enabled,s.points_expire_days
  into v_enabled,v_days
  from public.loyalty_program_settings s
  where s.instance_id=p_instance_id;

  if not coalesce(v_enabled,false) or v_days is null then return 0; end if;

  perform pg_advisory_xact_lock(hashtextextended('loyalty-expiry:'||p_instance_id::text,0));

  with source_offsets as(
    select x.reverses_entry_id as source_id,sum(x.points)::bigint as offset_points
    from public.loyalty_ledger x
    where x.instance_id=p_instance_id
      and x.reverses_entry_id is not null
      and x.entry_type in('reversal','expire')
    group by x.reverses_entry_id
  ),
  positives as(
    select
      p.id,p.customer_id,p.order_id,p.occurred_at,p.event_key,
      greatest(0::bigint,p.points::bigint+coalesce(o.offset_points,0)) as effective_points
    from public.loyalty_ledger p
    left join source_offsets o on o.source_id=p.id
    where p.instance_id=p_instance_id
      and p.points>0
      and p.entry_type in('earn','adjust')
  ),
  general_consumption as(
    select
      l.customer_id,
      abs(coalesce(sum(l.points) filter(
        where l.points<0
          and not(
            l.reverses_entry_id is not null
            and l.entry_type in('reversal','expire')
          )
      ),0))::bigint as consumed
    from public.loyalty_ledger l
    where l.instance_id=p_instance_id
    group by l.customer_id
  ),
  ordered as(
    select
      p.*,
      coalesce(c.consumed,0)::bigint as consumed,
      coalesce(
        sum(p.effective_points) over(
          partition by p.customer_id
          order by p.occurred_at,p.id
          rows between unbounded preceding and 1 preceding
        ),0
      )::bigint as cumulative_before
    from positives p
    left join general_consumption c on c.customer_id=p.customer_id
  ),
  remaining as(
    select
      o.*,
      greatest(
        0::bigint,
        o.effective_points-least(
          o.effective_points,
          greatest(0::bigint,o.consumed-o.cumulative_before)
        )
      )::bigint as remaining_points
    from ordered o
  )
  insert into public.loyalty_ledger(
    instance_id,customer_id,event_key,entry_type,points,order_id,reverses_entry_id,
    reason,metadata,occurred_at
  )
  select
    p_instance_id,r.customer_id,'expiry:'||r.id::text,'expire',
    -r.remaining_points::integer,r.order_id,r.id,
    'Lejárt hűségpont',
    jsonb_build_object(
      'source_event_key',r.event_key,
      'source_occurred_at',r.occurred_at,
      'expiry_days',v_days,
      'policy','fifo_source_expiry'
    ),
    now()
  from remaining r
  where r.remaining_points>0
    and r.occurred_at<=now()-make_interval(days=>v_days)
    and not exists(
      select 1 from public.loyalty_ledger x
      where x.instance_id=p_instance_id
        and x.entry_type='expire'
        and x.reverses_entry_id=r.id
    )
  on conflict(instance_id,event_key) do nothing;

  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_loyalty_points_v2(uuid) from public,anon,authenticated;
grant execute on function public.expire_loyalty_points_v2(uuid) to service_role;

create or replace function public.reverse_loyalty_points_for_ineligible_orders_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer:=0;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  insert into public.loyalty_ledger(
    instance_id,customer_id,event_key,entry_type,points,order_id,reverses_entry_id,
    reason,metadata,occurred_at
  )
  select
    p_instance_id,e.customer_id,'order-reversal:'||e.id::text,'reversal',
    -(
      abs(e.points)-coalesce((
        select sum(abs(x.points))::integer
        from public.loyalty_ledger x
        where x.instance_id=p_instance_id
          and x.reverses_entry_id=e.id
          and x.entry_type='expire'
      ),0)
    ),
    e.order_id,e.id,
    'Törölt vagy teljesen visszatérített rendelés pontjóváírásának visszavonása',
    jsonb_build_object(
      'source_event_key',e.event_key,
      'reason','order_ineligible_after_accrual',
      'expired_points_before_reversal',coalesce((
        select sum(abs(x.points))::integer
        from public.loyalty_ledger x
        where x.instance_id=p_instance_id
          and x.reverses_entry_id=e.id
          and x.entry_type='expire'
      ),0)
    ),
    now()
  from public.loyalty_ledger e
  join public.orders o
    on o.instance_id=p_instance_id and o.id=e.order_id
  where e.instance_id=p_instance_id
    and e.entry_type='earn'
    and e.order_id is not null
    and (e.event_key like 'order-earn:%' or e.event_key like 'tier-bonus:%')
    and (
      o.status='cancelled'
      or exists(
        select 1 from public.return_cases rc
        where rc.instance_id=p_instance_id and rc.order_id=o.id
        group by rc.order_id
        having coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)>=o.total_gross_huf
      )
    )
    and (
      abs(e.points)-coalesce((
        select sum(abs(x.points))::integer
        from public.loyalty_ledger x
        where x.instance_id=p_instance_id
          and x.reverses_entry_id=e.id
          and x.entry_type='expire'
      ),0)
    )>0
    and not exists(
      select 1 from public.loyalty_ledger r
      where r.instance_id=p_instance_id
        and r.reverses_entry_id=e.id
        and r.entry_type='reversal'
    )
  on conflict(instance_id,event_key) do nothing;

  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

do $loyalty_disable_guards$
declare
  v_sig regprocedure;
  v_def text;
  v_old text:='  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);';
  v_new text:='  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);'||chr(10)||
    '  if not coalesce((select s.enabled from public.loyalty_program_settings s where s.instance_id=p_instance_id),false) then raise exception ''LOYALTY_PROGRAM_DISABLED''; end if;';
begin
  for v_sig in
    select unnest(array[
      'public.redeem_loyalty_points_v2(uuid,uuid,integer,text,text,uuid)'::regprocedure,
      'public.use_loyalty_benefit_v2(uuid,uuid,uuid,text,uuid)'::regprocedure,
      'public.use_discount_loyalty_benefit_v2(uuid,uuid,uuid,uuid,integer,text,uuid)'::regprocedure
    ])
  loop
    select pg_get_functiondef(v_sig) into v_def;
    if strpos(v_def,'LOYALTY_PROGRAM_DISABLED')=0 then
      if strpos(v_def,v_old)=0 then raise exception 'LOYALTY_DISABLE_GUARD_PATCH_TARGET_MISSING: %',v_sig; end if;
      execute replace(v_def,v_old,v_new);
    end if;
  end loop;
end;
$loyalty_disable_guards$;

create or replace function public.process_loyalty_lifecycle_v2(
  p_instance_id uuid,
  p_run_key text
)
returns public.loyalty_processing_runs
language plpgsql
security definer
set search_path=''
as $$
declare
  v public.loyalty_processing_runs;
  v_accrued integer:=0;
  v_reversed integer:=0;
  v_expired integer:=0;
  v_profiles integer:=0;
  v_bonus integer:=0;
  v_milestones integer:=0;
  v_opportunities integer:=0;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);
  if nullif(trim(p_run_key),'') is null then raise exception 'A futási kulcs kötelező.'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('loyalty-lifecycle:'||p_instance_id::text||':'||trim(p_run_key),0)
  );

  select * into v
  from public.loyalty_processing_runs
  where instance_id=p_instance_id and run_key=trim(p_run_key)
  for update;

  if found and v.completed_at is not null then return v; end if;

  if not found then
    insert into public.loyalty_processing_runs(instance_id,run_key)
    values(p_instance_id,trim(p_run_key))
    returning * into v;
  end if;

  select public.accrue_loyalty_points_from_paid_orders_v2(p_instance_id) into v_accrued;
  select public.refresh_customer_value_profiles_v2(p_instance_id) into v_profiles;
  select public.apply_loyalty_tier_bonus_points_v2(p_instance_id) into v_bonus;
  select public.reverse_loyalty_points_for_ineligible_orders_v2(p_instance_id) into v_reversed;
  select public.expire_loyalty_points_v2(p_instance_id) into v_expired;
  select public.plan_customer_lifecycle_milestones_v2(p_instance_id) into v_milestones;
  select public.plan_loyalty_retention_opportunities_v2(p_instance_id) into v_opportunities;

  update public.loyalty_processing_runs
  set
    accrued_points_entries=v_accrued,
    reversed_points_entries=v_reversed,
    refreshed_profiles=v_profiles,
    completed_at=now(),
    metadata=jsonb_build_object(
      'sequence',jsonb_build_array(
        'accrue','refresh_profiles','tier_bonus','reverse','expire','milestones','retention_opportunities'
      ),
      'tier_bonus_entries',v_bonus,
      'expired_points_entries',v_expired,
      'milestones',v_milestones,
      'opportunity_upserts',v_opportunities,
      'authority','instance_id'
    )
  where id=v.id and instance_id=p_instance_id
  returning * into v;

  if v.id is null or v.instance_id<>p_instance_id or v.completed_at is null then
    raise exception 'LOYALTY_LIFECYCLE_EVIDENCE_MISSING';
  end if;

  return v;
end;
$$;

revoke all on function public.process_loyalty_lifecycle_v2(uuid,text) from public,anon,authenticated;
grant execute on function public.process_loyalty_lifecycle_v2(uuid,text) to service_role;

create or replace view public.loyalty_balances
with (security_invoker=true)
as
select customer_id,
       greatest(coalesce(sum(points),0),0)::bigint as points_balance,
       coalesce(sum(points) filter(where points>0),0)::bigint as lifetime_earned_points,
       abs(coalesce(sum(points) filter(where entry_type='redeem'),0))::bigint as lifetime_redeemed_points,
       max(occurred_at) as last_activity_at,
       abs(least(coalesce(sum(points),0),0))::bigint as points_debt,
       instance_id,
       abs(coalesce(sum(points) filter(where entry_type='expire'),0))::bigint as lifetime_expired_points,
       abs(coalesce(sum(points) filter(where entry_type='reversal'),0))::bigint as lifetime_reversed_points
from public.loyalty_ledger
group by instance_id,customer_id;

revoke all on public.loyalty_balances from public,anon,authenticated;
grant select on public.loyalty_balances to service_role;

create or replace view public.customer_loyalty_summary
with (security_invoker=true)
as
select
  p.customer_id,
  p.value_score,
  p.value_tier,
  p.lifecycle_segment,
  p.paid_orders,
  p.revenue_gross_huf,
  p.last_order_at,
  coalesce(b.points_balance,0::bigint) as points_balance,
  coalesce(b.lifetime_earned_points,0::bigint) as lifetime_earned_points,
  coalesce(b.lifetime_redeemed_points,0::bigint) as lifetime_redeemed_points,
  case when coalesce(s.enabled,false) then (
    select count(*)
    from public.active_customer_benefits a
    where a.instance_id=p.instance_id
      and a.customer_id=p.customer_id
      and a.usage_available=true
  ) else 0::bigint end as available_benefits,
  coalesce(b.points_debt,0::bigint) as points_debt,
  p.instance_id,
  coalesce(b.lifetime_expired_points,0::bigint) as lifetime_expired_points,
  coalesce(b.lifetime_reversed_points,0::bigint) as lifetime_reversed_points
from public.customer_value_profiles p
left join public.loyalty_balances b
  on b.instance_id=p.instance_id and b.customer_id=p.customer_id
left join public.loyalty_program_settings s
  on s.instance_id=p.instance_id;

revoke all on public.customer_loyalty_summary from public,anon,authenticated;
grant select on public.customer_loyalty_summary to service_role;
