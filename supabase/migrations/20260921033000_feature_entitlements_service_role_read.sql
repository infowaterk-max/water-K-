-- Server-side entitlement resolution reads this table through the Supabase
-- service-role client. Keep browser roles fail-closed; grant only the minimum
-- direct privilege required by the server resolver.
grant select on table public.feature_entitlements to service_role;
