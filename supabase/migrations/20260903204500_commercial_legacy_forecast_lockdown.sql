-- Retire unused global commercial forecasting read models from application runtime.
-- Tenant-aware operational CRM reads use instance-scoped tables/views and audited RPCs instead.

revoke all on public.commercial_pipeline_decision_support
from public,anon,authenticated,service_role;

revoke all on public.commercial_offer_forecast
from public,anon,authenticated,service_role;

revoke all on public.commercial_conversion_metrics
from public,anon,authenticated,service_role;

revoke all on public.commercial_executive_forecast
from public,anon,authenticated,service_role;

comment on view public.commercial_pipeline_decision_support
is 'Legacy global commercial decision-support view. Runtime access retired because it has no webshop instance authority.';
comment on view public.commercial_offer_forecast
is 'Legacy global commercial offer forecast. Runtime access retired because it aggregates across webshop instances.';
comment on view public.commercial_conversion_metrics
is 'Legacy global commercial conversion metrics. Runtime access retired because it aggregates across webshop instances.';
comment on view public.commercial_executive_forecast
is 'Legacy global commercial executive forecast. Runtime access retired; use tenant-scoped CRM read models.';
