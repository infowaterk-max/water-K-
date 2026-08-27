-- V9 reseller reorder intelligence.
-- Read-only decision model for approved reseller accounts.
create or replace view public.reseller_reorder_signals
with (security_invoker = true)
as
with paid as (
  select
    o.customer_id,
    lower(trim(o.customer_email)) as email_key,
    o.id as order_id,
    o.created_at,
    o.total_gross_huf,
    lag(o.created_at) over (partition by coalesce(o.customer_id::text,lower(trim(o.customer_email))) order by o.created_at) as previous_order_at
  from public.orders o
  where o.status in ('paid','processing','shipped','completed')
), grouped as (
  select
    coalesce(customer_id::text,email_key) as customer_key,
    max(customer_id) as customer_id,
    email_key,
    count(*)::integer as paid_orders,
    sum(total_gross_huf)::bigint as revenue_gross_huf,
    max(created_at) as last_order_at,
    avg(extract(epoch from (created_at-previous_order_at))/86400) filter (where previous_order_at is not null) as avg_reorder_days
  from paid
  group by coalesce(customer_id::text,email_key),email_key
)
select
  g.customer_key,
  g.customer_id,
  p.email,
  p.full_name,
  p.company_name,
  g.paid_orders,
  g.revenue_gross_huf,
  g.last_order_at,
  round(g.avg_reorder_days)::integer as avg_reorder_days,
  floor(extract(epoch from (now()-g.last_order_at))/86400)::integer as days_since_last_order,
  case
    when g.paid_orders < 2 then 'learning'
    when g.avg_reorder_days is null then 'learning'
    when now()-g.last_order_at >= make_interval(days => greatest(1,round(g.avg_reorder_days)::integer + 14)) then 'overdue'
    when now()-g.last_order_at >= make_interval(days => greatest(1,round(g.avg_reorder_days)::integer - 7)) then 'due_soon'
    else 'healthy'
  end as reorder_signal
from grouped g
join public.profiles p on p.id=g.customer_id
where p.role='reseller' and p.reseller_approved=true;

revoke all on public.reseller_reorder_signals from anon,authenticated;
grant select on public.reseller_reorder_signals to service_role;
comment on view public.reseller_reorder_signals is 'V9 approved-reseller reorder cadence and overdue decision model.';