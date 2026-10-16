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

### Incremental local role-smoke evidence (not the two-tenant RLS matrix)
The next narrow proof uses native Docker17 transactions only. After the original current-user fixture definition has been recorded (NULL stub), the isolated disposable database alone temporarily replaces the synthetic `auth.uid()` and `auth.jwt()` to read transaction-local request claim settings, verifies `SET LOCAL ROLE authenticated` and `anon` with `rolbypassrls=false`, checks a non-null synthetic authenticated subject and a null anonymous subject, and rolls back each role session. This deliberately has **zero tenant row assertions** and outputs `LOCAL_PROVIDER_CLAIM_SHIM_PROVEN_NOT_TENANT_RLS`. It is not signed JWT, PostgREST, Auth or production-role acceptance. No originally reviewed migration or real Supabase project is changed.

### F6-U03n two-tenant original-schema data proof candidate
The Docker-only role runner now seeds two distinct organizations and webshop_instances with actual `alap` vs `pro` subscriptions, users, active owner role bindings, real feature_entitlements, customer and internal_private Office threads, participants, messages and tasks under the exact 78-source application schema. The Alap tenant deliberately has a manual `teamChat` entitlement to exercise stale-entitlement resistance. Query cases independently `SET LOCAL ROLE authenticated` with separate synthetic JWT subjects in independent transactions and SELECT all visible rows without a client-side tenant filter. Expected real row outcomes: Alap owner exactly one A customer thread/message/task, Pro owner exactly B customer and B private thread plus two messages/tasks, unknown user no rows; any unexpected grant, all-zero positive, or host executor is a failure. This is strictly **local** Postgres RLS execution with synthetic GUC identity, not managed Supabase signed JWT, Data API or production authorization. The outcome is not accepted until the dedicated real PG17 CI run proves it.
