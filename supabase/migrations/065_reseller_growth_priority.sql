-- V9 reseller growth priority and revenue opportunity model.
create or replace view public.reseller_growth_priorities
with (security_invoker = true)
as
with base as (
  select
    r.*,
    case when r.paid_orders>0 then round(r.revenue_gross_huf::numeric/r.paid_orders)::bigint else 0 end as avg_order_value_gross_huf,
    case
      when r.reorder_signal='overdue' and r.revenue_gross_huf>=250000 then 100
      when r.reorder_signal='overdue' then 80
      when r.reorder_signal='due_soon' and r.revenue_gross_huf>=250000 then 70
      when r.reorder_signal='due_soon' then 55
      when r.reorder_signal='learning' and r.revenue_gross_huf>=250000 then 45
      else 20
    end as priority_score
  from public.reseller_reorder_signals r
)
select
  b.*,
  greatest(0,b.avg_order_value_gross_huf) as estimated_reorder_value_gross_huf,
  case
    when b.priority_score>=90 then 'critical'
    when b.priority_score>=70 then 'high'
    when b.priority_score>=50 then 'medium'
    else 'low'
  end as priority_band,
  case
    when b.reorder_signal='overdue' then 'Kapcsolatfelvétel és újrarendelési egyeztetés'
    when b.reorder_signal='due_soon' then 'Proaktív utánrendelési emlékeztető'
    when b.reorder_signal='learning' then 'Partnerciklus megfigyelése'
    else 'Nincs azonnali teendő'
  end as recommended_action,
  case
    when b.days_since_last_order>=180 then 'dormant'
    when b.days_since_last_order>=90 then 'inactive'
    when b.reorder_signal='overdue' then 'late'
    else 'active'
  end as inactivity_risk
from base b;

revoke all on public.reseller_growth_priorities from anon,authenticated;
grant select on public.reseller_growth_priorities to service_role;
comment on view public.reseller_growth_priorities is 'V9 prioritized reseller growth opportunities using reorder cadence, account value and inactivity.';
