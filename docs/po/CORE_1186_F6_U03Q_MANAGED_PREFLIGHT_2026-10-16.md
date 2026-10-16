# Core #1186 F6-U03q — Managed Supabase Auth/Data API read-only readiness
2026-10-16 | draft stacked on F6-U03p #1384 | Issue #1228 remains OPEN

## Actual managed observation (NOT a local fixture)
Using the connected Supabase project metadata and read-only SQL catalog for project `istjjkdcvsvilrycqecd` (Shoperation Fresh Install), 2026-10-16 UTC:
- Project ACTIVE_HEALTHY, PostgreSQL 17.6; waterk-platform also ACTIVE_HEALTHY; waterk-staging INACTIVE. Two projects remain active; none changed.
- Existing `public.office_threads`, `public.office_messages`, `public.office_tasks`: RLS true; legacy `office_threads_store_all`, `office_messages_store_all`, `office_tasks_store_all` policies still applied.
- `authenticated` and `anon` direct SELECT grants for the three Office relations: false; **this is NOT positive browser authorization**. It also does not itself prove an exploitable data leak.
- Modern `public.can_read_office_thread_v1`, `private.current_user_can_read_office_thread_v1`, `private.office_effective_feature_enabled_v1` signatures missing. `office_thread_participants` was absent from the examined public catalog.
- Supabase migration-list API returned an empty list, although Office tables exist. **Cannot infer how this hosted schema was provisioned** or claim the immutable 78-source candidate applied.
- The provider read-only catalog inspection is not an issued signed bearer JWT, managed PostgREST HTTP call, user session or Storage proof.

## Implementation contract
`scripts/shoperation-f6-u03q-managed-preflight.mjs` emits **SELECT-only metadata** to a local SQL artifact. The validated catalog snapshot is supplied explicitly; there is no built-in hosted write or privileged connection. It always refuses signed JWT, live Data API, Storage or release claims from a catalog alone. Legacy policies, missing participant helper/table, table grants, missing migration ledger and source-lineage gaps are categorized independently. `tests/shoperation-f6-u03q-managed-preflight.test.ts` includes adversarial cases against forged ready claims, false all-deny positives, wrong project and incomplete objects.

## Release blockers and next genuine integration requirement
1. Independently reconcile the 78 immutable SQL-source order to the existing Fresh Install schema and migration provenance before any forward-only non-destructive rollout. No automatic execute/reset/restore is authorized.
2. Resolve intended browser-direct Data API versus server-only Office exposure explicitly, using canonical app route design, not by automatically granting `authenticated`.
3. Under separate reviewed approval, demonstrate actual Supabase Auth-created signed JWT and authorized Alap customer and Pro private flows, forbidden cross-tenant and revoked access via real HTTPS PostgREST/API. Also verify managed storage and RPC only when applicable.
4. Require exact branch-head CI/Truth/Lifecycle and actual acceptance. Preserve #1186/#1228 OPEN, PR draft and main untouched until those external gates are met.

**No hosted changes, no project unpause, no new paid project, no automatic merge.** This unit establishes an honest managed-provider preflight, not complete Core or provider integration.
