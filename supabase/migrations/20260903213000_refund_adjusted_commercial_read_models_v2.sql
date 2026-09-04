-- Refund-adjusted tenant commercial read models.
-- Recognized customer value, retention and reseller reorder signals must not treat refunded value as live revenue.

create or replace view public.commercial_recognized_orders_v2
with (security_invoker=true) as
with refunds as (
  select
    rc.instance_id,
    rc.order_id,
    coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)::bigint as refunded_gross_huf
  from public.return_cases rc
  group by rc.instance_id,rc.order_id
), recognized as (
  select
    o.instance_id,
    o.id,
    o.customer_id,
    lower(trim(o.customer_email)) as email_key,
    o.created_at,
    o.total_gross_huf::bigint as original_gross_huf,
    least(o.total_gross_huf::bigint,greatest(0,coalesce(r.refunded_gross_huf,0))) as refunded_gross_huf,
    greatest(
      o.total_gross_huf::bigint-least(o.total_gross_huf::bigint,greatest(0,coalesce(r.refunded_gross_huf,0))),
      0
    )::bigint as recognized_gross_huf
  from public.orders o
  left join refunds r
    on r.instance_id=o.instance_id and r.order_id=o.id
  where o.status in('paid','processing','shipped','completed')
)
select
  instance_id,id,customer_id,email_key,created_at,original_gross_huf,refunded_gross_huf,recognized_gross_huf,
  case when original_gross_huf>0
    then recognized_gross_huf::numeric/original_gross_huf::numeric
    else 0::numeric
  end as recognition_ratio
from recognized
where recognized_gross_huf>0;

revoke all on public.commercial_recognized_orders_v2 from public,anon,authenticated;
grant select on public.commercial_recognized_orders_v2 to service_role;


create or replace view public.customer_commercial_metrics
with (security_invoker=true) as
with order_costs as (
  select
    oi.instance_id,
    oi.order_id,
    coalesce(sum(oi.unit_cost_net_huf_snapshot*oi.quantity),0)::numeric(14,2) as original_cogs_net_huf
  from public.order_items oi
  group by oi.instance_id,oi.order_id
), paid_orders as (
  select
    o.instance_id,
    o.id,
    o.customer_id,
    o.email_key,
    o.recognized_gross_huf,
    o.created_at,
    round(coalesce(c.original_cogs_net_huf,0)*o.recognition_ratio,2)::numeric(14,2) as cogs_net_huf
  from public.commercial_recognized_orders_v2 o
  left join order_costs c
    on c.instance_id=o.instance_id and c.order_id=o.id
), g as (
  select
    instance_id,
    coalesce(customer_id::text,email_key) as customer_key,
    max(customer_id::text)::uuid as customer_id,
    email_key,
    count(*)::integer as paid_orders,
    sum(recognized_gross_huf)::bigint as revenue_gross_huf,
    round(avg(recognized_gross_huf))::integer as aov_gross_huf,
    min(created_at) as first_order_at,
    max(created_at) as last_order_at,
    sum(cogs_net_huf)::numeric(14,2) as cogs_net_huf
  from paid_orders
  group by instance_id,coalesce(customer_id::text,email_key),email_key
)
select
  customer_key,
  customer_id,
  email_key,
  paid_orders,
  revenue_gross_huf,
  aov_gross_huf,
  first_order_at,
  last_order_at,
  floor(extract(epoch from now()-last_order_at)/86400)::integer as days_since_last_order,
  case
    when paid_orders=1 and now()-last_order_at<interval '30 days' then 'first_time'
    when paid_orders>=3 and revenue_gross_huf>=100000 and now()-last_order_at<interval '90 days' then 'vip'
    when paid_orders>=2 and now()-last_order_at<interval '30 days' then 'repeat'
    when now()-last_order_at>=interval '180 days' then 'dormant'
    when now()-last_order_at>=interval '90 days' then 'winback'
    when now()-last_order_at>=interval '30 days' then 'at_risk'
    else 'active'
  end as segment,
  cogs_net_huf,
  case when revenue_gross_huf>0
    then round(cogs_net_huf/revenue_gross_huf::numeric*100,2)
  end as cogs_to_revenue_pct,
  instance_id
from g;


create or replace view public.reseller_reorder_signals_v2
with (security_invoker=true) as
with paid as (
  select
    o.instance_id,
    o.customer_id,
    o.email_key,
    o.id as order_id,
    o.created_at,
    o.recognized_gross_huf as total_gross_huf,
    lag(o.created_at) over(
      partition by o.instance_id,coalesce(o.customer_id::text,o.email_key)
      order by o.created_at
    ) as previous_order_at
  from public.commercial_recognized_orders_v2 o
), grouped as (
  select
    instance_id,
    coalesce(customer_id::text,email_key) as customer_key,
    max(customer_id::text)::uuid as customer_id,
    email_key,
    count(*)::integer as paid_orders,
    sum(total_gross_huf)::bigint as revenue_gross_huf,
    max(created_at) as last_order_at,
    avg(extract(epoch from(created_at-previous_order_at))/86400)
      filter(where previous_order_at is not null) as avg_reorder_days
  from paid
  group by instance_id,coalesce(customer_id::text,email_key),email_key
)
select
  g.instance_id,
  g.customer_key,
  g.customer_id,
  p.email,
  p.full_name,
  p.company_name,
  g.paid_orders,
  g.revenue_gross_huf,
  g.last_order_at,
  round(g.avg_reorder_days)::integer as avg_reorder_days,
  floor(extract(epoch from(now()-g.last_order_at))/86400)::integer as days_since_last_order,
  case
    when g.paid_orders<2 or g.avg_reorder_days is null then 'learning'
    when now()-g.last_order_at>=make_interval(days=>greatest(1,round(g.avg_reorder_days)::integer+14)) then 'overdue'
    when now()-g.last_order_at>=make_interval(days=>greatest(1,round(g.avg_reorder_days)::integer-7)) then 'due_soon'
    else 'healthy'
  end as reorder_signal
from grouped g
join public.customer_instance_roles cir
  on cir.instance_id=g.instance_id and cir.user_id=g.customer_id
join public.profiles p on p.id=g.customer_id
where cir.role='reseller' and cir.reseller_approved=true;


create or replace view public.v9_channel_retention_summary_v2
with (security_invoker=true) as
with paid as (
  select
    o.instance_id,
    o.id,
    o.customer_id,
    o.email_key,
    o.created_at,
    o.recognized_gross_huf as total_gross_huf,
    case when cir.role='reseller' and cir.reseller_approved=true then 'reseller' else 'retail' end as channel
  from public.commercial_recognized_orders_v2 o
  left join public.customer_instance_roles cir
    on cir.instance_id=o.instance_id and cir.user_id=o.customer_id
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
    coalesce(o.customer_id::text,o.email_key) as customer_key,
    date_trunc('month',o.created_at)::date as order_month,
    o.recognized_gross_huf as total_gross_huf
  from public.commercial_recognized_orders_v2 o
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

-- Reassert the tenant-only runtime surface after replacement.
revoke all on public.customer_commercial_metrics from public,anon,authenticated;
revoke all on public.reseller_reorder_signals_v2 from public,anon,authenticated;
revoke all on public.v9_channel_retention_summary_v2 from public,anon,authenticated;
revoke all on public.v9_monthly_customer_cohorts_v2 from public,anon,authenticated;
grant select on public.customer_commercial_metrics to service_role;
grant select on public.reseller_reorder_signals_v2 to service_role;
grant select on public.v9_channel_retention_summary_v2 to service_role;
grant select on public.v9_monthly_customer_cohorts_v2 to service_role;

comment on view public.commercial_recognized_orders_v2
is 'Tenant recognized-order authority: paid-like orders net of completed refunds; fully refunded orders are excluded.';
comment on view public.customer_commercial_metrics
is 'Tenant customer commercial value calculated from refund-adjusted recognized order value.';
comment on view public.reseller_reorder_signals_v2
is 'Tenant reseller reorder model based on refund-adjusted recognized orders and current customer_instance_roles authority.';
