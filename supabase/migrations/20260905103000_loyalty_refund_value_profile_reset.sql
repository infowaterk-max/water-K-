-- Block 3 production pilot: keep customer-value profiles consistent when the last recognized order is fully refunded.
-- The commercial read model already excludes fully refunded value. The refresh must also clear stale materialized
-- customer-value fields when a customer no longer has any recognized commercial order in the tenant.

create or replace function public.refresh_customer_value_profiles_v2(p_instance_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_upserted integer:=0;
  v_reset integer:=0;
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
  get diagnostics v_upserted=row_count;

  -- Preserve the profile and immutable loyalty history, but clear stale commercial value when
  -- the refund-adjusted authority no longer contains any recognized order for the customer.
  update public.customer_value_profiles p
  set paid_orders=0,
      revenue_gross_huf=0,
      aov_gross_huf=0,
      days_since_last_order=null,
      lifecycle_segment='new',
      value_score=0,
      value_tier='standard',
      first_order_at=null,
      last_order_at=null,
      recalculated_at=now()
  where p.instance_id=p_instance_id
    and not exists(
      select 1
      from public.customer_commercial_metrics m
      where m.instance_id=p_instance_id and m.customer_id=p.customer_id
    )
    and (
      p.paid_orders<>0
      or p.revenue_gross_huf<>0
      or p.aov_gross_huf<>0
      or p.days_since_last_order is not null
      or p.lifecycle_segment<>'new'
      or p.value_score<>0
      or p.value_tier<>'standard'
      or p.first_order_at is not null
      or p.last_order_at is not null
    );
  get diagnostics v_reset=row_count;

  return v_upserted+v_reset;
end;
$$;

revoke all on function public.refresh_customer_value_profiles_v2(uuid)
from public,anon,authenticated;
grant execute on function public.refresh_customer_value_profiles_v2(uuid)
to service_role;

comment on function public.refresh_customer_value_profiles_v2(uuid)
is 'Refresh tenant customer value from refund-adjusted commercial metrics and reset stale profiles when fully refunded value leaves no recognized order.';
