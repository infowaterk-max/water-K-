-- Post-release security hygiene: keep the tenant synchronization helper trigger-only.
--
-- The function is SECURITY DEFINER because the trigger must resolve variant tenant scope
-- independently from the caller's row visibility. It is not an application RPC entrypoint.
-- Revoke every Data API/service role direct EXECUTE grant explicitly so the final ACL does
-- not depend on environment-specific default function privileges.

revoke all on function public.sync_product_recommendation_instance()
from public, anon, authenticated, service_role;

comment on function public.sync_product_recommendation_instance() is
  'Trigger-only tenant guard for product recommendation rules; direct RPC execution is intentionally denied.';
