-- V9 customer commercial intelligence.
-- Read model only: no customer-facing write access and no duplicated financial source of truth.

create or replace view public.customer_commercial_metrics
with (security_invoker = true)
as
with paid_orders as (
  select
    o.id,
    o.customer_id,
    lower(trim(o.customer_email)) as email_key,
    o.total_gross_huf,
    o.created_at,
    coalesce(sum(oi.unit_cost_net_huf_snapshot * oi.quantity),0)::numeric(14,2) as cogs_net_huf
  from public.orders o
  left join public.order_items oi on oi.order_id=o.id
  where o.status in ('paid','processing','shipped','completed')
  group by o.id,o.customer_id,o.customer_email,o.total_gross_huf,o.created_at
), grouped as (
  select
    coalesce(customer_id::text,email_key) as customer_key,
    max(customer_id::text)::uuid as customer_id,
    email_key,
    count(*)::integer as paid_orders,
    sum(total_gross_huf)::bigint as revenue_gross_huf,
    round(avg(total_gross_huf))::integer as aov_gross_huf,
    min(created_at) as first_order_at,
    max(created_at) as last_order_at,
    sum(cogs_net_huf)::numeric(14,2) as cogs_net_huf
  from paid_orders
  group by coalesce(customer_id::text,email_key),email_key
)
select
  g.customer_key,
  g.customer_id,
  g.email_key,
  g.paid_orders,
  g.revenue_gross_huf,
  g.aov_gross_huf,
  g.first_order_at,
  g.last_order_at,
  floor(extract(epoch from (now()-g.last_order_at))/86400)::integer as days_since_last_order,
  case
    when g.paid_orders=1 and now()-g.last_order_at < interval '30 days' then 'first_time'
    when g.paid_orders>=3 and g.revenue_gross_huf>=100000 and now()-g.last_order_at < interval '90 days' then 'vip'
    when g.paid_orders>=2 and now()-g.last_order_at < interval '30 days' then 'repeat'
    when now()-g.last_order_at >= interval '180 days' then 'dormant'
    when now()-g.last_order_at >= interval '90 days' then 'winback'
    when now()-g.last_order_at >= interval '30 days' then 'at_risk'
    else 'active'
  end as segment,
  g.cogs_net_huf,
  case when g.revenue_gross_huf>0 then round((g.cogs_net_huf/g.revenue_gross_huf::numeric)*100,2) else null end as cogs_to_revenue_pct
from grouped g;

revoke all on public.customer_commercial_metrics from anon,authenticated;
grant select on public.customer_commercial_metrics to service_role;

comment on view public.customer_commercial_metrics is 'V9 customer LTV/AOV/recency segmentation read model using paid-order history and frozen order-item cost snapshots.';
