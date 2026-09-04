-- Complete the loyalty engine's tenant migration.
-- All mutable business operations and lifecycle planning become explicit-instance, idempotent and fail-closed.

-- The original milestone uniqueness was global and prevented the same customer from having
-- the same lifecycle milestone in two different webshop instances.
alter table public.customer_lifecycle_milestones
  drop constraint if exists customer_lifecycle_milestones_customer_id_milestone_key_key;
drop index if exists public.customer_lifecycle_milestones_customer_id_milestone_key_key;
create unique index if not exists customer_lifecycle_milestones_instance_customer_key_uq
  on public.customer_lifecycle_milestones(instance_id,customer_id,milestone_key);

create or replace function private.ensure_loyalty_program_defaults_v2(p_instance_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_instance_id is null
     or not exists(
       select 1 from public.webshop_instances w
       where w.id=p_instance_id and w.status in('pilot','active')
     ) then
    raise exception 'LOYALTY_INSTANCE_REQUIRED';
  end if;

  insert into public.loyalty_program_settings(
    instance_id,singleton,tier_bonus_cutover_at,updated_at
  )
  values(p_instance_id,true,now(),now())
  on conflict(instance_id) do nothing;

  insert into public.loyalty_benefit_rules(
    instance_id,rule_key,value_tier,benefit_type,benefit_value,
    min_order_gross_huf,max_uses_per_customer,minimum_margin_percent,metadata
  )
  values
    (p_instance_id,'silver-points-boost','silver','points_multiplier',1.10,0,null,null,
      jsonb_build_object('description','10% pontszorzó, közvetlen árengedmény nélkül')),
    (p_instance_id,'gold-points-boost','gold','points_multiplier',1.25,0,null,null,
      jsonb_build_object('description','25% pontszorzó, közvetlen árengedmény nélkül')),
    (p_instance_id,'platinum-points-boost','platinum','points_multiplier',1.50,0,null,null,
      jsonb_build_object('description','50% pontszorzó, közvetlen árengedmény nélkül')),
    (p_instance_id,'platinum-manual-review','platinum','manual_review',null,100000,null,null,
      jsonb_build_object('description','Nagy értékű előny személyes jóváhagyással'))
  on conflict(instance_id,rule_key) do nothing;
end;
$$;

revoke all on function private.ensure_loyalty_program_defaults_v2(uuid)
from public,anon,authenticated,service_role;


-- Re-harden the already existing tenant-safe core read/refresh/accrual entrypoints.
create or replace function public.refresh_customer_value_profiles_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer:=0;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  insert into public.customer_value_profiles(
    instance_id,customer_id,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,
    days_since_last_order,lifecycle_segment,value_score,value_tier,
    first_order_at,last_order_at,recalculated_at
  )
  select
    p_instance_id,m.customer_id,m.email_key,m.paid_orders,m.revenue_gross_huf,m.aov_gross_huf,
    m.days_since_last_order,m.segment,
    least(100,greatest(0,
      least(40,m.paid_orders*8)+
      least(40,(m.revenue_gross_huf/25000)::integer)+
      case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end
    )),
    case
      when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=85 then 'platinum'
      when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=65 then 'gold'
      when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=40 then 'silver'
      else 'standard'
    end,
    m.first_order_at,m.last_order_at,now()
  from public.customer_commercial_metrics m
  where m.instance_id=p_instance_id and m.customer_id is not null
  on conflict(instance_id,customer_id) do update set
    email_key=excluded.email_key,
    paid_orders=excluded.paid_orders,
    revenue_gross_huf=excluded.revenue_gross_huf,
    aov_gross_huf=excluded.aov_gross_huf,
    days_since_last_order=excluded.days_since_last_order,
    lifecycle_segment=excluded.lifecycle_segment,
    value_score=excluded.value_score,
    value_tier=excluded.value_tier,
    first_order_at=excluded.first_order_at,
    last_order_at=excluded.last_order_at,
    recalculated_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.accrue_loyalty_points_from_paid_orders_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer:=0;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

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

create or replace function public.get_customer_loyalty_snapshot_v2(
  p_instance_id uuid,
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if p_instance_id is null
     or not exists(
       select 1 from public.webshop_instances w
       where w.id=p_instance_id and w.status in('pilot','active')
     ) then
    raise exception 'LOYALTY_INSTANCE_REQUIRED';
  end if;
  if p_customer_id is null then raise exception 'LOYALTY_CUSTOMER_REQUIRED'; end if;

  -- Snapshot reads are intentionally side-effect free. Program defaults are provisioned by
  -- lifecycle/mutation entrypoints, never by a customer-facing read.
  select jsonb_build_object(
    'summary',coalesce(
      (select to_jsonb(s)
       from public.customer_loyalty_summary s
       where s.instance_id=p_instance_id and s.customer_id=p_customer_id),
      '{}'::jsonb
    ),
    'benefits',coalesce(
      (select jsonb_agg(to_jsonb(b) order by b.rule_key)
       from public.active_customer_benefits b
       where b.instance_id=p_instance_id
         and b.customer_id=p_customer_id
         and b.usage_available=true),
      '[]'::jsonb
    ),
    'ledger',coalesce(
      (select jsonb_agg(to_jsonb(l) order by l.occurred_at desc)
       from (
         select id,entry_type,points,reason,occurred_at,order_id
         from public.loyalty_ledger
         where instance_id=p_instance_id and customer_id=p_customer_id
         order by occurred_at desc
         limit 30
       ) l),
      '[]'::jsonb
    )
  ) into v_result;

  return coalesce(v_result,jsonb_build_object('summary','{}'::jsonb,'benefits','[]'::jsonb,'ledger','[]'::jsonb));
end;
$$;


create or replace function public.redeem_loyalty_points_v2(
  p_instance_id uuid,
  p_customer_id uuid,
  p_points integer,
  p_event_key text,
  p_reason text,
  p_order_id uuid default null
)
returns public.loyalty_ledger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_raw_balance bigint;
  v_row public.loyalty_ledger;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);
  if p_customer_id is null then raise exception 'LOYALTY_CUSTOMER_REQUIRED'; end if;
  if p_points is null or p_points<=0 then raise exception 'A beváltandó pontok száma pozitív kell legyen.'; end if;
  if nullif(trim(p_event_key),'') is null then raise exception 'Az eseménykulcs kötelező.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_instance_id::text||':'||p_customer_id::text,0));

  select * into v_row
  from public.loyalty_ledger
  where instance_id=p_instance_id and event_key=trim(p_event_key);
  if found then
    if v_row.customer_id<>p_customer_id
       or v_row.entry_type<>'redeem'
       or v_row.points<>-p_points
       or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)
          <>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid) then
      raise exception 'Az eseménykulcs már más hűségművelethez tartozik.';
    end if;
    return v_row;
  end if;

  select coalesce(sum(points),0)
    into v_raw_balance
  from public.loyalty_ledger
  where instance_id=p_instance_id and customer_id=p_customer_id;

  if v_raw_balance<=0 or v_raw_balance<p_points then
    raise exception 'Nincs elegendő felhasználható hűségpont.';
  end if;

  if p_order_id is not null and not exists(
    select 1 from public.orders o
    where o.id=p_order_id
      and o.instance_id=p_instance_id
      and o.customer_id=p_customer_id
  ) then
    raise exception 'A rendelés nem ehhez az ügyfélhez és webshophoz tartozik.';
  end if;

  insert into public.loyalty_ledger(
    instance_id,customer_id,event_key,entry_type,points,order_id,reason,metadata
  )
  values(
    p_instance_id,p_customer_id,trim(p_event_key),'redeem',-p_points,p_order_id,
    coalesce(nullif(trim(p_reason),''),'Hűségpont beváltás'),
    jsonb_build_object('balance_before',v_raw_balance,'balance_after',v_raw_balance-p_points)
  )
  returning * into v_row;

  return v_row;
end;
$$;


create or replace function public.use_loyalty_benefit_v2(
  p_instance_id uuid,
  p_customer_id uuid,
  p_rule_id uuid,
  p_usage_key text,
  p_order_id uuid default null
)
returns public.loyalty_benefit_usage
language plpgsql
security definer
set search_path=''
as $$
declare
  r public.loyalty_benefit_rules;
  p public.customer_value_profiles;
  v_uses integer;
  v_order_total integer;
  v_row public.loyalty_benefit_usage;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);
  if p_customer_id is null or p_rule_id is null then raise exception 'LOYALTY_BENEFIT_IDENTITY_REQUIRED'; end if;
  if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_instance_id::text||':'||p_customer_id::text||':'||p_rule_id::text,0)
  );

  select * into v_row
  from public.loyalty_benefit_usage
  where instance_id=p_instance_id and usage_key=trim(p_usage_key);
  if found then
    if v_row.customer_id<>p_customer_id
       or v_row.rule_id<>p_rule_id
       or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)
          <>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid) then
      raise exception 'A használati kulcs már más benefit-művelethez tartozik.';
    end if;
    return v_row;
  end if;

  select * into r
  from public.loyalty_benefit_rules
  where id=p_rule_id and instance_id=p_instance_id;
  if not found or not r.active then raise exception 'Az előny nem aktív.'; end if;
  if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
  if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;
  if r.benefit_type='discount_percent' then
    raise exception 'A százalékos kedvezmény csak margin-ellenőrzött benefit-függvényen keresztül használható.';
  end if;

  select * into p
  from public.customer_value_profiles
  where instance_id=p_instance_id and customer_id=p_customer_id;
  if not found or p.value_tier<>r.value_tier then
    raise exception 'Az ügyfél nem jogosult erre az előnyre.';
  end if;

  select count(*)::integer into v_uses
  from public.loyalty_benefit_usage
  where instance_id=p_instance_id and customer_id=p_customer_id and rule_id=p_rule_id;
  if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then
    raise exception 'Az előny felhasználási limitje elfogyott.';
  end if;

  if p_order_id is not null then
    select o.total_gross_huf into v_order_total
    from public.orders o
    where o.id=p_order_id and o.instance_id=p_instance_id and o.customer_id=p_customer_id;
    if not found then raise exception 'A rendelés nem ehhez az ügyfélhez és webshophoz tartozik.'; end if;
    if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
  elsif r.min_order_gross_huf>0 then
    raise exception 'Ehhez az előnyhöz rendelés szükséges.';
  end if;

  insert into public.loyalty_benefit_usage(
    instance_id,usage_key,customer_id,rule_id,order_id,benefit_snapshot
  )
  values(
    p_instance_id,trim(p_usage_key),p_customer_id,p_rule_id,p_order_id,
    jsonb_build_object(
      'rule_key',r.rule_key,
      'value_tier',r.value_tier,
      'benefit_type',r.benefit_type,
      'benefit_value',r.benefit_value,
      'minimum_margin_percent',r.minimum_margin_percent,
      'min_order_gross_huf',r.min_order_gross_huf
    )
  )
  returning * into v_row;

  return v_row;
end;
$$;


create or replace function public.use_discount_loyalty_benefit_v2(
  p_instance_id uuid,
  p_customer_id uuid,
  p_rule_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_usage_key text,
  p_order_id uuid default null
)
returns public.loyalty_benefit_usage
language plpgsql
security definer
set search_path=''
as $$
declare
  r public.loyalty_benefit_rules;
  p public.customer_value_profiles;
  v_uses integer;
  v_order_total integer;
  v_preview jsonb;
  v_row public.loyalty_benefit_usage;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);
  if p_customer_id is null or p_rule_id is null or p_variant_id is null then
    raise exception 'LOYALTY_DISCOUNT_IDENTITY_REQUIRED';
  end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'A mennyiség pozitív kell legyen.'; end if;
  if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_instance_id::text||':'||p_customer_id::text||':'||p_rule_id::text,0)
  );

  select * into v_row
  from public.loyalty_benefit_usage
  where instance_id=p_instance_id and usage_key=trim(p_usage_key);
  if found then
    if v_row.customer_id<>p_customer_id
       or v_row.rule_id<>p_rule_id
       or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)
          <>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid)
       or coalesce(v_row.benefit_snapshot->>'variant_id','')<>p_variant_id::text
       or coalesce((v_row.benefit_snapshot->>'quantity')::integer,0)<>p_quantity then
      raise exception 'A használati kulcs már más kedvezményes benefit-művelethez tartozik.';
    end if;
    return v_row;
  end if;

  select * into r
  from public.loyalty_benefit_rules
  where id=p_rule_id and instance_id=p_instance_id;
  if not found or not r.active or r.benefit_type<>'discount_percent' then
    raise exception 'Nem használható kedvezményes előny.';
  end if;
  if r.benefit_value is null or r.benefit_value<=0 or r.benefit_value>100 then
    raise exception 'Érvénytelen kedvezményérték.';
  end if;
  if r.minimum_margin_percent is null then
    raise exception 'A kedvezményes előnyhöz minimum margin kötelező.';
  end if;
  if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
  if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;

  select * into p
  from public.customer_value_profiles
  where instance_id=p_instance_id and customer_id=p_customer_id;
  if not found or p.value_tier<>r.value_tier then
    raise exception 'Az ügyfél nem jogosult erre az előnyre.';
  end if;

  select count(*)::integer into v_uses
  from public.loyalty_benefit_usage
  where instance_id=p_instance_id and customer_id=p_customer_id and rule_id=p_rule_id;
  if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then
    raise exception 'Az előny felhasználási limitje elfogyott.';
  end if;

  if p_order_id is not null then
    select o.total_gross_huf into v_order_total
    from public.orders o
    where o.id=p_order_id and o.instance_id=p_instance_id and o.customer_id=p_customer_id;
    if not found then raise exception 'A rendelés nem ehhez az ügyfélhez és webshophoz tartozik.'; end if;
    if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
  elsif r.min_order_gross_huf>0 then
    raise exception 'Ehhez az előnyhöz rendelés szükséges.';
  end if;

  select public.preview_promotion_margin_v2(
    p_instance_id,p_variant_id,r.benefit_value,r.minimum_margin_percent
  ) into v_preview;
  if jsonb_typeof(v_preview)<>'object'
     or v_preview->>'variantId' is distinct from p_variant_id::text
     or coalesce((v_preview->>'safe')::boolean,false) is not true then
    raise exception 'A kedvezmény nem teljesíti a webshop margin-védelmét.';
  end if;

  insert into public.loyalty_benefit_usage(
    instance_id,usage_key,customer_id,rule_id,order_id,benefit_snapshot
  )
  values(
    p_instance_id,trim(p_usage_key),p_customer_id,p_rule_id,p_order_id,
    jsonb_build_object(
      'rule_key',r.rule_key,
      'value_tier',r.value_tier,
      'benefit_type',r.benefit_type,
      'benefit_value',r.benefit_value,
      'minimum_margin_percent',r.minimum_margin_percent,
      'variant_id',p_variant_id,
      'quantity',p_quantity,
      'margin_preview',v_preview
    )
  )
  returning * into v_row;

  return v_row;
end;
$$;


create or replace function public.apply_loyalty_tier_bonus_points_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer:=0;v_cutover timestamptz;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  select s.tier_bonus_cutover_at into v_cutover
  from public.loyalty_program_settings s
  where s.instance_id=p_instance_id;
  if not found or v_cutover is null then raise exception 'LOYALTY_PROGRAM_SETTINGS_MISSING'; end if;

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
    -abs(e.points),e.order_id,e.id,
    'Törölt vagy teljesen visszatérített rendelés pontjóváírásának visszavonása',
    jsonb_build_object('source_event_key',e.event_key,'reason','order_ineligible_after_accrual'),
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


create or replace function public.plan_customer_lifecycle_milestones_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_total integer:=0;v_rows integer:=0;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  insert into public.customer_lifecycle_milestones(
    instance_id,customer_id,milestone_key,milestone_type,source
  )
  select p_instance_id,p.customer_id,'first-order','first_order',
         jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier)
  from public.customer_value_profiles p
  where p.instance_id=p_instance_id and p.paid_orders>=1
  on conflict(instance_id,customer_id,milestone_key) do nothing;
  get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

  insert into public.customer_lifecycle_milestones(
    instance_id,customer_id,milestone_key,milestone_type,source
  )
  select p_instance_id,p.customer_id,'repeat-order','repeat_order',
         jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier)
  from public.customer_value_profiles p
  where p.instance_id=p_instance_id and p.paid_orders>=2
  on conflict(instance_id,customer_id,milestone_key) do nothing;
  get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

  insert into public.customer_lifecycle_milestones(
    instance_id,customer_id,milestone_key,milestone_type,source
  )
  select p_instance_id,p.customer_id,'high-value:'||p.value_tier,'high_value',
         jsonb_build_object('value_score',p.value_score,'value_tier',p.value_tier,'revenue_gross_huf',p.revenue_gross_huf)
  from public.customer_value_profiles p
  where p.instance_id=p_instance_id and p.value_tier in('gold','platinum')
  on conflict(instance_id,customer_id,milestone_key) do nothing;
  get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

  insert into public.customer_lifecycle_milestones(
    instance_id,customer_id,milestone_key,milestone_type,source
  )
  select p_instance_id,p.customer_id,'at-risk:'||to_char(current_date,'YYYY-MM'),'at_risk',
         jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score)
  from public.customer_value_profiles p
  where p.instance_id=p_instance_id and p.lifecycle_segment='at_risk'
  on conflict(instance_id,customer_id,milestone_key) do nothing;
  get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

  insert into public.customer_lifecycle_milestones(
    instance_id,customer_id,milestone_key,milestone_type,source
  )
  select p_instance_id,p.customer_id,'winback:'||to_char(current_date,'YYYY-MM'),'winback',
         jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score)
  from public.customer_value_profiles p
  where p.instance_id=p_instance_id and p.lifecycle_segment in('winback','dormant')
  on conflict(instance_id,customer_id,milestone_key) do nothing;
  get diagnostics v_rows=row_count;v_total:=v_total+v_rows;

  return v_total;
end;
$$;


create or replace function public.plan_loyalty_retention_opportunities_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_inserted integer:=0;v_updated integer:=0;
begin
  perform private.ensure_loyalty_program_defaults_v2(p_instance_id);

  update public.commercial_opportunities o
  set
    status='dismissed',
    closed_at=now(),
    updated_at=now(),
    source=coalesce(o.source,'{}'::jsonb)||jsonb_build_object(
      'auto_closed_reason','v11_lifecycle_no_longer_actionable',
      'loyalty_source','v11_loyalty'
    )
  where o.instance_id=p_instance_id
    and o.channel='b2c'
    and o.kind in('retention','winback')
    and o.status in('open','in_progress')
    and coalesce(o.source->>'loyalty_source','')='v11_loyalty'
    and o.customer_id is not null
    and not exists(
      select 1
      from public.customer_value_profiles p
      where p.instance_id=p_instance_id
        and p.customer_id=o.customer_id
        and p.lifecycle_segment in('at_risk','winback','dormant')
    );

  update public.commercial_opportunities o
  set
    kind=case when p.lifecycle_segment in('winback','dormant') then 'winback' else 'retention' end,
    priority_score=greatest(
      o.priority_score,
      case when p.value_tier='platinum' then 95
           when p.value_tier='gold' then 85
           when p.lifecycle_segment in('winback','dormant') then 80 else 70 end
    ),
    expected_value_net_huf=greatest(
      o.expected_value_net_huf,
      round(greatest(coalesce(p.aov_gross_huf,0),0)::numeric/1.27,2)
    ),
    probability_percent=greatest(
      o.probability_percent,
      case when p.value_tier='platinum' then 55
           when p.value_tier='gold' then 45
           when p.lifecycle_segment='at_risk' then 35 else 25 end
    ),
    due_at=least(coalesce(o.due_at,now()),now()),
    reason='V11 lifecycle: '||p.lifecycle_segment||' · tier: '||p.value_tier,
    recommended_action=case
      when p.lifecycle_segment='at_risk' then 'Megtartási lehetőség felülvizsgálata'
      else 'Win-back lehetőség felülvizsgálata'
    end,
    source=(coalesce(o.source,'{}'::jsonb)-'auto_closed_reason')||jsonb_build_object(
      'loyalty_source','v11_loyalty',
      'value_score',p.value_score,
      'value_tier',p.value_tier,
      'points_balance',coalesce(b.points_balance,0),
      'lifecycle_segment',p.lifecycle_segment,
      'aov_gross_huf',p.aov_gross_huf,
      'value_basis','gross_div_1_27_estimate'
    ),
    updated_at=now()
  from public.customer_value_profiles p
  left join public.loyalty_balances b
    on b.instance_id=p_instance_id and b.customer_id=p.customer_id
  where p.instance_id=p_instance_id
    and o.instance_id=p_instance_id
    and o.customer_id=p.customer_id
    and o.channel='b2c'
    and o.kind in('retention','winback')
    and o.status in('open','in_progress')
    and p.lifecycle_segment in('at_risk','winback','dormant');
  get diagnostics v_updated=row_count;

  insert into public.commercial_opportunities(
    instance_id,opportunity_key,channel,customer_id,customer_email,kind,status,
    priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source
  )
  select
    p_instance_id,
    'b2c:'||p.customer_id::text||':active',
    'b2c',
    p.customer_id,
    p.email_key,
    case when p.lifecycle_segment in('winback','dormant') then 'winback' else 'retention' end,
    'open',
    case when p.value_tier='platinum' then 95
         when p.value_tier='gold' then 85
         when p.lifecycle_segment in('winback','dormant') then 80 else 70 end,
    round(greatest(coalesce(p.aov_gross_huf,0),0)::numeric/1.27,2),
    case when p.value_tier='platinum' then 55
         when p.value_tier='gold' then 45
         when p.lifecycle_segment='at_risk' then 35 else 25 end,
    now(),
    'V11 lifecycle: '||p.lifecycle_segment||' · tier: '||p.value_tier,
    case when p.lifecycle_segment='at_risk'
      then 'Megtartási lehetőség felülvizsgálata'
      else 'Win-back lehetőség felülvizsgálata'
    end,
    jsonb_build_object(
      'loyalty_source','v11_loyalty',
      'value_score',p.value_score,
      'value_tier',p.value_tier,
      'points_balance',coalesce(b.points_balance,0),
      'lifecycle_segment',p.lifecycle_segment,
      'aov_gross_huf',p.aov_gross_huf,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.customer_value_profiles p
  left join public.loyalty_balances b
    on b.instance_id=p_instance_id and b.customer_id=p.customer_id
  where p.instance_id=p_instance_id
    and p.lifecycle_segment in('at_risk','winback','dormant')
  on conflict(instance_id,opportunity_key) do update set
    status=case
      when public.commercial_opportunities.status='dismissed'
       and public.commercial_opportunities.source->>'auto_closed_reason'='v11_lifecycle_no_longer_actionable'
      then 'open'
      else public.commercial_opportunities.status
    end,
    customer_id=excluded.customer_id,
    customer_email=excluded.customer_email,
    kind=excluded.kind,
    priority_score=greatest(public.commercial_opportunities.priority_score,excluded.priority_score),
    expected_value_net_huf=greatest(public.commercial_opportunities.expected_value_net_huf,excluded.expected_value_net_huf),
    probability_percent=greatest(public.commercial_opportunities.probability_percent,excluded.probability_percent),
    due_at=least(coalesce(public.commercial_opportunities.due_at,excluded.due_at),excluded.due_at),
    reason=excluded.reason,
    recommended_action=excluded.recommended_action,
    source=(coalesce(public.commercial_opportunities.source,'{}'::jsonb)-'auto_closed_reason')||excluded.source,
    closed_at=case
      when public.commercial_opportunities.status='dismissed'
       and public.commercial_opportunities.source->>'auto_closed_reason'='v11_lifecycle_no_longer_actionable'
      then null
      else public.commercial_opportunities.closed_at
    end,
    updated_at=now()
  where public.commercial_opportunities.status in('open','in_progress')
     or (
       public.commercial_opportunities.status='dismissed'
       and public.commercial_opportunities.source->>'auto_closed_reason'='v11_lifecycle_no_longer_actionable'
     );
  get diagnostics v_inserted=row_count;

  return v_updated+v_inserted;
end;
$$;


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
        'accrue','refresh_profiles','tier_bonus','reverse','milestones','retention_opportunities'
      ),
      'tier_bonus_entries',v_bonus,
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


-- Internal lifecycle stages are callable only by the function owner through process_loyalty_lifecycle_v2.
revoke all on function public.apply_loyalty_tier_bonus_points_v2(uuid)
from public,anon,authenticated,service_role;
revoke all on function public.reverse_loyalty_points_for_ineligible_orders_v2(uuid)
from public,anon,authenticated,service_role;
revoke all on function public.plan_customer_lifecycle_milestones_v2(uuid)
from public,anon,authenticated,service_role;
revoke all on function public.plan_loyalty_retention_opportunities_v2(uuid)
from public,anon,authenticated,service_role;

-- Explicit tenant runtime entrypoints.
revoke all on function public.refresh_customer_value_profiles_v2(uuid) from public,anon,authenticated;
revoke all on function public.accrue_loyalty_points_from_paid_orders_v2(uuid) from public,anon,authenticated;
revoke all on function public.get_customer_loyalty_snapshot_v2(uuid,uuid) from public,anon,authenticated;
revoke all on function public.redeem_loyalty_points_v2(uuid,uuid,integer,text,text,uuid) from public,anon,authenticated;
revoke all on function public.use_loyalty_benefit_v2(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.use_discount_loyalty_benefit_v2(uuid,uuid,uuid,uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.process_loyalty_lifecycle_v2(uuid,text) from public,anon,authenticated;

grant execute on function public.refresh_customer_value_profiles_v2(uuid) to service_role;
grant execute on function public.accrue_loyalty_points_from_paid_orders_v2(uuid) to service_role;
grant execute on function public.get_customer_loyalty_snapshot_v2(uuid,uuid) to service_role;
grant execute on function public.redeem_loyalty_points_v2(uuid,uuid,integer,text,text,uuid) to service_role;
grant execute on function public.use_loyalty_benefit_v2(uuid,uuid,uuid,text,uuid) to service_role;
grant execute on function public.use_discount_loyalty_benefit_v2(uuid,uuid,uuid,uuid,integer,text,uuid) to service_role;
grant execute on function public.process_loyalty_lifecycle_v2(uuid,text) to service_role;

-- One legacy global lifecycle planner was not part of the earlier temporary lockdown list.
revoke all on function public.plan_customer_lifecycle_milestones()
from public,anon,authenticated,service_role;

comment on function public.process_loyalty_lifecycle_v2(uuid,text)
is 'Tenant-authoritative, idempotent loyalty lifecycle orchestration for one webshop instance.';
comment on function public.redeem_loyalty_points_v2(uuid,uuid,integer,text,text,uuid)
is 'Tenant-scoped atomic loyalty redemption with instance-local idempotency and balance evidence.';
comment on function public.use_loyalty_benefit_v2(uuid,uuid,uuid,text,uuid)
is 'Tenant-scoped governed non-discount loyalty benefit usage.';
comment on function public.use_discount_loyalty_benefit_v2(uuid,uuid,uuid,uuid,integer,text,uuid)
is 'Tenant-scoped discount loyalty benefit usage guarded by the webshop-aware margin preview.';
