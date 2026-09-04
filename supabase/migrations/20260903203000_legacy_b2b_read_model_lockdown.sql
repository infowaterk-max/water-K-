-- Retire global V9 reseller/retention read models from application runtime.
-- Tenant-authoritative _v2 replacements remain the only service-role read path.

revoke all on public.reseller_reorder_signals
from public,anon,authenticated,service_role;

revoke all on public.reseller_growth_priorities
from public,anon,authenticated,service_role;

revoke all on public.v9_growth_dashboard
from public,anon,authenticated,service_role;

revoke all on public.v9_channel_retention_summary
from public,anon,authenticated,service_role;

revoke all on public.v9_monthly_customer_cohorts
from public,anon,authenticated,service_role;

-- Reassert the intended tenant-scoped runtime surface explicitly.
revoke all on public.reseller_reorder_signals_v2
from public,anon,authenticated;
revoke all on public.reseller_growth_priorities_v2
from public,anon,authenticated;
revoke all on public.v9_growth_dashboard_v2
from public,anon,authenticated;
revoke all on public.v9_channel_retention_summary_v2
from public,anon,authenticated;
revoke all on public.v9_monthly_customer_cohorts_v2
from public,anon,authenticated;

grant select on public.reseller_reorder_signals_v2 to service_role;
grant select on public.reseller_growth_priorities_v2 to service_role;
grant select on public.v9_growth_dashboard_v2 to service_role;
grant select on public.v9_channel_retention_summary_v2 to service_role;
grant select on public.v9_monthly_customer_cohorts_v2 to service_role;

comment on view public.reseller_reorder_signals
is 'Legacy global reseller read model. Runtime access retired; use reseller_reorder_signals_v2 with instance_id.';
comment on view public.reseller_growth_priorities
is 'Legacy global reseller read model. Runtime access retired; use reseller_growth_priorities_v2 with instance_id.';
comment on view public.v9_growth_dashboard
is 'Legacy global growth dashboard. Runtime access retired; use v9_growth_dashboard_v2 with instance_id.';
comment on view public.v9_channel_retention_summary
is 'Legacy global channel retention view. Runtime access retired; use v9_channel_retention_summary_v2 with instance_id.';
comment on view public.v9_monthly_customer_cohorts
is 'Legacy global cohort view. Runtime access retired; use v9_monthly_customer_cohorts_v2 with instance_id.';
