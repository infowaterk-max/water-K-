-- Core #1186 U10A2-F2C: append-only revoke of legacy service-role delegation creator.
-- Canonical source: supabase/migrations/20260907205600_team_permissions_disable_legacy_delegation_creator.sql
-- Canonical SHA256: 7f9badd253e3a7f70b214767fbdc45bb30e6168f57f49e27e7ccc8b909ae98a9
-- Requires previous 0047 Team Permissions v1 and 0048 scoped delegation v2.
-- This source check alone does NOT prove real PostgreSQL role privileges.
-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.
-- Scoped delegation v2 is the only supported creation path.
-- Keep the v1 function definition for historical migration compatibility, but remove its runtime service-role execute grant.

revoke execute on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) from service_role;
