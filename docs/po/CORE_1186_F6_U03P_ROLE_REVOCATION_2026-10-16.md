# Core #1186 F6-U03p — Local PostgreSQL17 Office role and permission lifecycle
2026-10-16 | Draft unit stacked on #1367, not a hosted release.

## Purpose
Reuse unchanged 78 original migration SQL sources and the verified F6-U03n two-tenant fixture / F6-U03o anon and cross-tenant negative proof. Add original-schema native authenticated SELECT evidence for a Pro tenant support-role nonparticipant, viewer, private participant leave, role revoked/expired, Alap customer Office entitlement expired, and Pro-to-Alap downgrade. Queries read real office_threads, office_messages, office_tasks unfiltered by tenant under SET LOCAL ROLE authenticated and transaction-local synthetic auth.uid claim. Require positive customer/Pro private controls and exact negative per-table row identities; avoid all-zero false PASS. Each mutation rolls back in its own transaction.

## Security and scope
Test fixture is disposable GitHub Actions postgres:17 service with connection/peer identity check; setup actor alone uses postgres to mutate fake fixture, but browser SELECT is always authenticated and non-BYPASSRLS. The original 78 reviewed SQL files, plan catalogue, grants, policies, production schemas, Supabase Auth/Storage/Data API and staging are untouched. No paid project, unpause, reset or live data write.

**Not proven:** Supabase-issued signed JWT and real expiry/revocation, PostgREST/Data API schema exposure, Storage, hosted Fresh Install target TLS, approval/release and full external RPC semantics. LOCAL PG17 simulation must never be promoted to provider proof. #1186/#1228 remain OPEN and this PR DRAFT pending all exact-head gates.

## Acceptance
Critical Development Guard and Plan Before Code PASS before test code; genuine PG17 workflow, adversarial Vitest, edit-time/Reference Sync/Incremental Replay, full Security/Quality/TypeScript/Build/Completion Truth/Lifecycle exact-head checks. Only use CI-produced closed-plan bytes with verified source identity. No automatic merge.
