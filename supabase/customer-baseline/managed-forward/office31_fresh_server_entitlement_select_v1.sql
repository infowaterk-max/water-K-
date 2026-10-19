-- Shoperation Fresh Install F6 Office acceptance only.
-- Restore narrowly scoped server-side SELECT used by the canonical entitlement resolver.
-- Never grant directly to anon or authenticated and never touch production/staging.
DO $office31_preflight$
BEGIN
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 3
    OR NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261018113500' AND name='shoperation_managed_0046_current_state')
    OR NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261018120000' AND name='shoperation_office_31_forward_v1')
    OR NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name='office31_fresh_admin_context_gate_v1')
    OR (SELECT count(*) FROM public.webshop_instances WHERE slug='office31-acceptance-pro-20261018' AND subscription_plan='pro') <> 1
    OR (SELECT count(*) FROM auth.users) <> 1
  THEN RAISE EXCEPTION 'OFFICE31_ENTITLEMENT_GRANT_WRONG_FRESH_TARGET'; END IF;
  IF to_regclass('public.feature_entitlements') IS NULL
    OR has_table_privilege('service_role','public.feature_entitlements','SELECT')
    OR has_table_privilege('anon','public.feature_entitlements','SELECT')
    OR has_table_privilege('authenticated','public.feature_entitlements','SELECT')
  THEN RAISE EXCEPTION 'OFFICE31_ENTITLEMENT_GRANT_PRIVILEGE_PRECONDITION'; END IF;
END $office31_preflight$;
GRANT SELECT ON TABLE public.feature_entitlements TO service_role;
DO $office31_postflight$
BEGIN
  IF NOT has_table_privilege('service_role','public.feature_entitlements','SELECT')
    OR has_table_privilege('anon','public.feature_entitlements','SELECT')
    OR has_table_privilege('authenticated','public.feature_entitlements','SELECT')
  THEN RAISE EXCEPTION 'OFFICE31_ENTITLEMENT_GRANT_POSTFLIGHT_FAILED'; END IF;
END $office31_postflight$;
NOTIFY pgrst, 'reload schema';
