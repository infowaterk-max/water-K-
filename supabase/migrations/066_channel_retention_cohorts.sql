-- V9 executive retention analytics.
-- Read-only service-role views for channel performance and monthly customer cohorts.
create or replace view public.v9_channel_retention_summary
with (security_invoker = true)
as
with paid as (
  select
    o.id,
    o.customer_id,
    lower(trim(o.customer_email)) as email_key,
    o.created_at,
    o.total_gross_huf,
    case when p.role='reseller' and p.reseller_approved=true then 'reseller' else 'retail' end as channel
  from public.orders o
  left join public.profiles p on p.id=o.customer_id
  where o.status in ('paid','processing','shipped','completed')
), customer_stats as (
  select
    channel,
    coalesce(customer_id::text,email_key) as customer_key,
    count(*)::integer as orders_count,
    sum(total_gross_huf)::bigint as revenue_gross_huf,
    min(created_at) as first_order_at,
    max(created_at) as last_order_at
  from paid
  group by channel,coalesce(customer_id::text,email_key)
)
select
  channel,
  count(*)::integer as paying_customers,
  count(*) filter(where orders_count>=2)::integer as repeat_customers,
  round(100.0*count(*) filter(where orders_count>=2)/nullif(count(*),0),1) as repeat_rate_percent,
  sum(orders_count)::integer as paid_orders,
  sum(revenue_gross_huf)::bigint as revenue_gross_huf,
  round(sum(revenue_gross_huf)::numeric/nullif(sum(orders_count),0))::bigint as aov_gross_huf,
  round(sum(revenue_gross_huf)::numeric/nullif(count(*),0))::bigint as ltv_gross_huf,
  count(*) filter(where last_order_at>=now()-interval '90 days')::integer as active_90d_customers,
  count(*) filter(where last_order_at<now()-interval '90 days')::integer as inactive_90d_customers
from customer_stats
group by channel;

create or replace view public.v9_monthly_customer_cohorts
with (security_invoker = true)
as
with paid as (
  select
    coalesce(o.customer_id::text,lower(trim(o.customer_email))) as customer_key,
    date_trunc('month',o.created_at)::date as order_month,
    o.total_gross_huf
  from public.orders o
  where o.status in ('paid','processing','shipped','completed')
), firsts as (
  select customer_key,min(order_month) as cohort_month from paid group by customer_key
), activity as (
  select
    f.cohort_month,
    p.customer_key,
    p.order_month,
    ((extract(year from age(p.order_month,f.cohort_month))*12)+extract(month from age(p.order_month,f.cohort_month)))::integer as month_number,
    sum(p.total_gross_huf)::bigint as revenue_gross_huf
  from paid p join firsts f using(customer_key)
  group by f.cohort_month,p.customer_key,p.order_month
), sizes as (
  select cohort_month,count(*)::integer as cohort_customers from firsts group by cohort_month
)
select
  a.cohort_month,
  a.month_number,
  s.cohort_customers,
  count(distinct a.customer_key)::integer as active_customers,
  round(100.0*count(distinct a.customer_key)/nullif(s.cohort_customers,0),1) as retention_percent,
  sum(a.revenue_gross_huf)::bigint as revenue_gross_huf
from activity a join sizes s using(cohort_month)
group by a.cohort_month,a.month_number,s.cohort_customers
order by a.cohort_month desc,a.month_number;

revoke all on public.v9_channel_retention_summary from anon,authenticated;
revoke all on public.v9_monthly_customer_cohorts from anon,authenticated;
grant select on public.v9_channel_retention_summary to service_role;
grant select on public.v9_monthly_customer_cohorts to service_role;
comment on view public.v9_channel_retention_summary is 'V9 executive retail/reseller repeat-rate, LTV, AOV and inactivity summary.';
comment on view public.v9_monthly_customer_cohorts is 'V9 monthly customer cohort retention and revenue view.';
