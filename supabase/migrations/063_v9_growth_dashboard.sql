-- V9 executive growth decision dashboard.
create or replace view public.v9_growth_dashboard
with (security_invoker = true)
as
select
  (select count(*)::integer from public.customer_commercial_metrics) as paying_customers,
  (select count(*)::integer from public.customer_commercial_metrics where segment='vip') as vip_customers,
  (select count(*)::integer from public.customer_commercial_metrics where segment='at_risk') as at_risk_customers,
  (select count(*)::integer from public.customer_commercial_metrics where segment in ('winback','dormant')) as winback_customers,
  (select coalesce(sum(revenue_gross_huf),0)::bigint from public.customer_commercial_metrics) as customer_lifetime_revenue_gross_huf,
  (select count(*)::integer from public.checkout_recovery_intents where status='open' and expires_at>now()) as open_checkout_recoveries,
  (select count(*)::integer from public.customer_journeys where status='active') as active_journeys,
  (select count(*)::integer from public.customer_journey_steps where status='pending' and scheduled_at<=now()) as due_journey_steps,
  (select count(*)::integer from public.reseller_reorder_signals where reorder_signal='overdue') as overdue_resellers,
  (select count(*)::integer from public.reseller_reorder_signals where reorder_signal='due_soon') as due_soon_resellers,
  now() as calculated_at;

revoke all on public.v9_growth_dashboard from anon,authenticated;
grant select on public.v9_growth_dashboard to service_role;
comment on view public.v9_growth_dashboard is 'V9 single-row executive retention, recovery and reseller reorder decision summary.';