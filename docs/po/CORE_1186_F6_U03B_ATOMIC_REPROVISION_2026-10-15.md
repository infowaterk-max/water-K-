# Core #1186 — F6-U03b disposable Fresh Install reprovision authority

**2026-10-15. Status: guarded transaction REVIEW ONLY. No hosted schema reset, migration replay or authenticated RLS proof.**

## Dependency and owner

- Stacked on F6-U03a PR #1308 exact closed CI head `ab5a155715156abb13a07796a8d44b8dcb3c226a`.
- Separate F6-U03b draft PR #1317. Canonical Development Guard PASS `DEV-074C4B63`, digest `074c4b63`, risk 4/5, twenty known failures across release-/quality-infrastructure. Plan Before Code must pass and actual CI/Completion Truth/Lifecycle must close **before hosted proof**.
- Existing `.github/workflows/fresh-install-proof.yml` remains the **only** canonical clean-target proof entrypoint. No new parallel migration authority, no additional Supabase active project, and no Builder or template diversion.

## Exact observed reusable disposable target

- Only permissible project: `Shoperation Fresh Install`, ref `istjjkdcvsvilrycqecd`; platform `ewdederyvnwmghlydbno` is ACTIVE and staging `rfuvzgumbardvbvqjxdq` INACTIVE. Neither is authorized for this task.
- Former 0046 postflight has **175 public + 2 private tables**, **344 public and 36 private functions**, **126 public RLS policies**.
- Exactly **113 neutral subscription/entitlement records in seven known tables**; zero customer, orders, workers or Office content. Fresh Install Auth users/identities/sessions/MFA all zero; Storage objects/uploads zero. Four configured empty buckets are known and must be preserved.
- Historical app catalog MD5 `e312b40ad91150ce937f4aa00db587f3` binds 4621 object/column/trigger/policy/index/constraint/function-definition entries. Seven catalog row-data hashes are pinned in `scripts/shoperation-fresh-disposable-reprovision.mjs`; count equality alone is insufficient.
- One previously observed external dependency: `auth.users` trigger `on_auth_user_created` depends on `private.handle_new_user`, which canonical `auth-bootstrap.sql` must restore after any app schema recreation.
- These are past **read-only** observations and **must be independently verified again, transactionally, immediately before cleanup**. No old report is destruction authorization.

## Candidate SQL and runtime safety

1. F6-U03a source verifier must confirm all **59** ordered customer-baseline files, `manifest.json`, Auth bootstrap, seed and clean-target preflight/postflight are byte-exact against reviewed F6-U02 Git ancestor `6a29778b6ea971f42fe25eb26181b192a97ab23d`. No legacy `supabase/migrations`, old strict Pro-only Office migration, or dynamic unreviewed content.
2. The database URL and actual TLS endpoint must bind to the *single* allowed Fresh Install project. No inherited `PGHOSTADDR`, `PGSERVICE`, `PGOPTIONS` selectors or permissive TLS. Explicit manual confirmation and a separately reviewed runner are mandatory.
3. Immediately inside a **single connection/transaction**: take a transaction advisory lock, acquire bounded exclusive application-table locks, check project/database/role, all catalog fingerprints, exactly seven neutral table hashes, all zero other data, no Auth sessions, no Storage uploads or extra buckets, zero Supabase migration records, no unknown external object dependency. A mismatch means rollback, not exception.
4. Only after all checks pass, recreate **only application-owned** public/private state, re-run target-preflight, all reviewed migrations, Auth bootstrap, neutral seed and target-postflight, then COMMIT. Deliberately fail before/during/after 0058, bootstrap, seed and postflight in fault-injection tests and verify the old schema survives.
5. Preserve Supabase-managed Auth, Storage, Realtime, and internal migration schemas. Existing four buckets are provider-managed; historical baseline SQL does upsert bucket metadata, which is **not** proof of a virgin provider environment. Existing four matching buckets should remain empty; do not delete or truncate `storage.*` directly.
6. Capture exact commit/branch/run, target ref and TLS identity, source SHA/hash, before/after fingerprints and rollback/commit state in scoped evidence, but never credentials. After a connection loss at possible COMMIT, result is UNKNOWN pending separate read-only postflight.
7. **No claim of Alap/Pro Office readiness** without genuine signed-in, negative tenant/role/RLS and provider/worker behavioral verification, even if all SQL applies.

## Current F6-U03b deliverable

`scripts/shoperation-fresh-disposable-reprovision.mjs` provides a read-only snapshot validator and a full ordered SQL **review artifact** bound to the approved Git ancestor. Its generated SQL starts with BEGIN and contains a deliberate `RAISE EXCEPTION 'FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED'` **before** either DROP SCHEMA statement. No executable transport, `psql` runner or DDL connection exists; `HOSTED_EXECUTION_ENABLED=false`. Even if someone mistakenly hands the emitted SQL to psql, it aborts the transaction before deletion.

`tests/shoperation-fresh-disposable-reprovision.test.ts` challenges altered table counts, customer/Auth/Storage/migration data, seven exact neutral catalog hashes, cross-schema dependency flags, bucket metadata, wrong target and unsafe libpq env, and asserts the permanent stop barrier and source-first ordering.

The existing Fresh Install workflow adds at most an **offline review-only** manual choice that has no database connection and emits only an artifact digest. Its default manual clean-target proof path remains unchanged. No workflow mode may turn the offline review flag into SQL execution.

**This draft does not grant authority for live reset.** Completing F6-U03b requires the safe transaction guard, external-dependency proof, real rollback fault injection, separately authorized deployment path and exact-head CI. Any postponed item remains BLOCKED and must not be silently moved to VERIFIED_DONE.

## Resume instructions

On subsequent generic 'folytassuk' requests, inspect exact main/PR #1304/#1308/#1317 and CI/Lifecycle. Finish any failing F6-U03b source/guard tests and close its scoped plan; then proceed to independently governed live hosted reprovision only when all required evidence and explicit target authorization exist. Do not switch to Builder/Factory or merge these stacked PRs out of dependency order.
