# F6-U03n – two-tenant Alap/Pro role-session rehearsal (in progress; local schema prerequisite only)
2026-10-16 · [Draft PR #1364](https://github.com/infowaterk-max/water-K-/pull/1364) · Parent draft #1361 · Owner #1228

## Verifiable source precondition

Actual current #1361 local PostgreSQL17 catalog inventory and original 78-file SQL postflight are verified. The original local provider fixture intentionally creates `auth.uid()` as `SELECT NULL::uuid` and `auth.jwt()` as an empty JSON object. Its native RLS policies therefore cannot supply a valid positive signed-in user test; any all-denied check is a **false-positive risk**.

The F6-U03n first step reuses the canonical exact 59+19 source and Git hash authority from F6-U03k/F6-U03l, commits exactly those unchanged SQL files on a real identity-checked disposable Docker PG17 and records a read-only catalog snapshot of 10 necessary tenant, store membership, Office and entitlement tables, all original column types, NOT NULL/default metadata and native constraints. It also captures the actual `auth.uid()`/`auth.jwt()` definitions and verifies authenticated/anon are non-BYPASSRLS PostgreSQL roles.

**Machine decision of this first step is deliberately** `LOCAL_SCHEMA_DISCOVERED_TENANT_RLS_NOT_PROVEN`, with `realSignedSupabaseJwtProven=false`, `localTenantPositiveNegativeProven=false`, `releaseAuthorized=false`. A SUCCESS at this stage does NOT close F6-U03n or satisfy the user-role matrix.

## Actual acceptance contract still required within this draft

Using the captured true native FK/column contract, produce bounded two-tenant synthetic fixtures in exactly one isolated Docker PG17 database: separate A/Alap and B/Pro organizations/webshop_instances, active role bindings, current-user office participant rows, customer and internal_private threads, relevant messages/tasks, and allowed/denied feature entitlements. Only after original source schema has been committed may the Docker-only provider auth stub be overridden to map transaction-local `request.jwt.claim.sub` to `auth.uid()`, with a big explicit **LOCAL SYNTHETIC JWT** label.

Run each role test with `SET LOCAL ROLE authenticated` or `anon`, verify current_user and `rolbypassrls=false` for the role, use independent transactions with no superuser RLS bypass, and validate positive same-tenant Alap customer support and Pro internal participant reads against actual Office tables. Negative cases: foreign tenant, unknown user, non-member/nonparticipant, anon, Alap private chat despite stale manual/trial entitlements, and revoked/expired feature. Verify two tenant organizations are different and no test is passing through an all-zero fixture.

The **separate still-open real provider acceptance** requires genuine signed-in Supabase Auth JWTs, Data API exposed-schema controls and Storage/policy tests. These cannot be inferred from `SET LOCAL ROLE` or a fake Postgres request sub, even if all local assertions succeed.

## Safety

No edits to original SQL, source review manifest, RLS policies, paid project capacity or actual Supabase projects. No hosted DB selectors. Original abort-before-DROP still enforced. This PR stays **DRAFT**, #1186/#1228 open, while missing positive role fixture and real signed-in provider proof remain BLOCKED.
