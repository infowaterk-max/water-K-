# Core #1186 · F6-U03 — Controlled Disposable Fresh Install Reprovision

> **Status: pre-implementation risk / execution plan. Not an implementation, database reset, migration run, CI PASS or verified completion.**
>
> **Owner / sequence:** #1186 Core Office; stacked after F6-U02 PR #1304. Do not switch to Builder/Factory/template production. Follow AGENTS.md OBSERVE → DEFINE → MODEL → PLAN → CHALLENGE → IMPROVE → PROVE_PLAN before executable edits.

## Observed, read-only, 2026-10-15

- `main` HEAD `dc726ea075d6918883595442d446e37c023731e4`; F6-U02 draft PR #1304 head `6a29778b6ea971f42fe25eb26181b192a97ab23d` (unchanged during inspection).
- Supabase Vision Kft. account: `waterk-platform` `ewdederyvnwmghlydbno` **ACTIVE_HEALTHY**, `waterk-staging` `rfuvzgumbardvbvqjxdq` **INACTIVE**, dedicated `Shoperation Fresh Install` `istjjkdcvsvilrycqecd` **ACTIVE_HEALTHY**.
- Disposable target contains **175 public tables** and **2 private tables**, **344 public functions**, **36 private functions**, **126 public RLS policies** and **zero registered Supabase migration history rows**.
- Exact counts across all 177 application tables = **113 records**, in **seven catalog-only tables**: entitlement_capabilities 38; subscription_plan_catalog 2; plan_capability_grants 53; addon_entitlement_catalog 4; addon_plan_compatibility 7; addon_capability_grants 4; entitlement_source_precedence 5. All other public/private application tables contain **zero records**.
- `auth.users`, `auth.identities`, `auth.sessions`, `auth.mfa_factors` = **0**. `storage.objects` and in-progress multipart uploads = **0**. Four empty buckets: `product-media`, `digital-products-private`, `order-documents-private`, `product-documents-private`.
- The only detected trigger from a non-application schema to an application-owned function is `auth.users/on_auth_user_created -> private.handle_new_user()`. There are no observed external foreign keys pointing to public/private application tables, nor extensions installed in those schemas.
- Prior canonical customer-baseline manifest records successful disposable 0046 postflight with exactly **175 public tables / 344 public functions / 126 public policies**. This is strong but **not object-by-object** evidence of the same prior schema; the target remains **not empty** and must be rejected by the existing `supabase/customer-baseline/target-preflight.sql`.
- Existing `.github/workflows/fresh-install-proof.yml` correctly expects an empty target and applies the isolated `supabase/customer-baseline/migrations` baseline using psql in a transaction, then postflight. It **does not** clean an occupied target. The canonical branch contains **59 customer-baseline SQL files** ending in corrected `0058_digital_office_plan_scoped_sql_guard_v2.sql`, plus Auth bootstrap and neutral seed. Do NOT replay the legacy `supabase/migrations` path, the superseded global Pro-only Office v1 or fixed-list Team Chat/Email plan-sync sources.

## Scope and design (not yet execution-authorized)

**Choose a narrowly guarded opt-in extension of the existing Fresh Install proof path, not a second deployment authority.** Implement as a separate risk-scoped development unit *after* approved Plan Before Code.

1. **Target identity gate, fail closed:** exact allowlisted disposable ref `istjjkdcvsvilrycqecd`; validate the actual Postgres connection URL binds to that ref (direct host or correctly authenticated pooler user), database `postgres`, explicit one-off confirmation input. Never trust the GitHub branch name, PR text, self-reported environment variable or connection `current_database()` alone to assert project identity. Reject platform and staging refs.
2. **Database contents gate:** in the **same transaction** that will attempt reprovision, recheck all known 175+2 app tables, exact seven catalog counts (113 neutral records), zero customer/commerce/Office/worker data, zero auth users/identities/sessions/MFA, zero Storage objects/uploads, precisely four known empty buckets, zero migration history, expected schema/function/policy signature, extension/managed-schema dependencies and the one known Auth trigger. Any difference -> **ROLLBACK / BLOCK / report**, never silently widen scope.
3. **Atomic reprovision:** under a single PostgreSQL connection and `BEGIN`, with bounded locks/timeouts and an advisory lock, remove only the *verified disposable application-owned public/private schema state*; leave managed `auth`, `storage`, `realtime`, `supabase_migrations` and extensions intact. Existing cross-schema `auth.users` bootstrap trigger may be removed by dependency cascade and must be recreated by the **existing canonical** `auth-bootstrap.sql`. Run `target-preflight.sql` before the baseline in that same transaction, then 59 ordered customer-baseline SQL files, Auth bootstrap, neutral seed and `target-postflight.sql` **before COMMIT**. Any failure rolls back the schema removal and new installation. There must be no committed empty intermediate state.
4. **Trust and runtime proof:** an exact-head signed GitHub workflow artifact must record the target identity, guard decisions, 59-file sequence, source/ref SHA, target preflight, migration apply, auth bootstrap, neutral seed, postflight, any rollback and resulting checksum. A successful schema replay is **only Fresh Install schema proof**; authenticated Alap/Pro RLS, tenant isolation, provider/worker attachment/delivery and Lifecycle/Completion Truth remain independent mandatory gates. No READY or merge claim from source-only evidence.
5. **Fail-safe mode:** default workflow remains existing **empty-target-only** mode. Disposable reprovision requires a separately named explicit manual dispatch option plus exact reference confirmation, no scheduled or PR-triggered automatic destructive run. Do not change Vercel, staging, platform, production, Supabase project billing or active-project allocation.

## Risk challenge / negative tests required before an executable implementation

- Reject wrong project ref, direct/pooler host mismatch, `/postgres` DB mismatch, untrusted/auth-less URL, missing exact typed confirmation and accidental default destructive mode.
- Reject any **one** unexpected table row, user/session, uploaded file, new Storage bucket, legacy migration row, schema signature drift, unexpected extension, another managed-schema trigger or managed-schema foreign key.
- Force SQL failure before/after schema removal, migration 0001, migration 0058, Auth bootstrap, neutral seed and postflight; prove **transactional rollback** retains earlier schema and Auth/Storage state, rather than a partially reset target. Test Postgres connection loss/timeout and concurrent invocation.
- Detect missing, duplicated, wrong-order, tampered or superseded migration source and exact-head/contract hash mismatch. A later fork/changed PR head makes previous proof stale.
- Ensure no `DROP SCHEMA` plan executes unless a clean target can be established and the entire checked replay is available in the same transaction.
- Independent safety review required because schema deletion is a high-risk operation **even on this isolated disposable target**.

## Immediate resumable work

1. Confirm this plan and its actual source/authority dependencies under the existing Development Guard/Plan Before Code workflow for a **new** F6-U03 release unit; do not reuse closed F6-U02 `quality/development/active-plan.json` authority.
2. Implement targeted guard and atomic replay opt-in, plus automated negative tests and deliberate fault-injection. Validate exact-head CI, Completion Truth and Lifecycle.
3. Only then run the authorized disposable target proof. If runner/dispatch access is unavailable, leave the target unchanged, record the precise executable handoff and stop rather than performing an unpaired SQL wipe.
4. Continue existing Core #1186 until behavioral Office RLS and tenant/plan closure are proven. The separate #1307 roadmap PR is nonblocking documentation work only and must not reorder Core execution.

## Sign-off

This document records the PO's continuing intent and a candidate safe plan. It does **not** assert approval of a specific executable SQL reset, passing Plan Before Code, verification of the candidate replay implementation, or any database modification.
