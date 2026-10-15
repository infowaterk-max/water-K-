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

## Read-only fingerprint and Storage authority refinement (2026-10-15)

Further isolated Supabase catalog verification of the exact Fresh Install ref found **4,621 catalog entries** across application functions, relations, columns, policies, indexes, triggers and constraints; their sorted, stable current-state MD5 digest is `e312b40ad91150ce937f4aa00db587f3`. A hardened disposable-reset **candidate** can require this exact digest in addition to count checks; matching the current target proves *no observed drift from this catalog snapshot*, not provenance from the historical 0046 proof. Recompute and revalidate against actual target immediately before any authorized reset.

The seven neutral catalog tables also have exact sorted JSONB-row digests (MD5):
- `addon_capability_grants`: `603e4da6e9b73f18f08de9b648c8d140`
- `addon_entitlement_catalog`: `ab9929cc98f52e790627f7f29e5e6cea`
- `addon_plan_compatibility`: `52e8cd3fc13054647ffbcc11f57005a0`
- `entitlement_capabilities`: `b0837c65a65b17613030b647e74764f5`
- `entitlement_source_precedence`: `c60294237cba6a8100c39eae1ed7c29b`
- `plan_capability_grants`: `c0d071de44955a6eb0225bd86159f37d`
- `subscription_plan_catalog`: `cb1a33c97779af7bb0e009b1ba650410`

**Newly verified external provider boundary:** [Supabase Storage schema documentation](https://supabase.com/docs/guides/storage/schema/design) explicitly forbids directly mutating Storage-managed SQL rows; Storage object/bucket mutations belong to the Storage API. Therefore an atomic PostgreSQL app-schema reset **cannot honestly claim to have reset the four preexisting Storage buckets**. Do not delete or truncate `storage.buckets`/objects in SQL, and do not mislabel reused but validated empty buckets as newly created. Record preexisting Storage state separately, or obtain and verify genuine Storage-API-managed cleanup in an independently authorized operation. Treat the two proof claims distinctly: **application schema zero-state proof** versus **full provider environment fresh-state proof**.

**Local candidate only:** an isolated offline script+SQL candidate was checked with 5 mocked/structural Node tests PASS (identity, negative URLs, order, explicit execute control). This is **not committed** to this PR, not canonical Development Guard PASS, not actual SQL execution and not runtime proof. It must not be promoted to runnable workflow or any destructive DB action until a new F6-U03 scoped Development Transaction passes existing Plan Before Code / review and negative fault-path proof.

## 2026-10-15 adversarial prototype finding — two confirmed release blockers

The uncommitted local safety-prototype bundle contains a Node runner, SQL catalog guard and five mock tests. **Those five tests are not adequate execution clearance**. Additional hostile-fixture tests against the real local prototype implementation reproduced:

1. **`F6-U03-SEC-01: BASELINE_CONTENT_NOT_PINNED` (HIGH / BLOCK):** replacing the SQL body of every intermediate migration with arbitrary text while keeping 59 expected filenames and the same first/last names causes `validateBaseline()` to return success. Thus the former file-count/name checks do not prove exact source identity. Require the existing canonical `scripts/validate-customer-baseline.mjs`, `scripts/shoperation-office-baseline-lineage.mjs`, full ordered source/file SHA256 parity and `scripts/customer-baseline-contract-hash.mjs` to pass, with the **approved expected contract hash bound to the exact reviewed commit/PR head**. A dynamically computed checksum alone is insufficient if the contents are unreviewed. Reject added, removed, duplicate, reordered, renamed, unsafe psql-meta-command and altered migrations before any destructive action; include tamper tests for 0058.
2. **`F6-U03-SEC-02: LIBPQ_ENVIRONMENT_NOT_ISOLATED` (HIGH / BLOCK):** the runner inherits arbitrary `PG*` environment variables when spawning `psql`. A mock execution confirmed user-supplied `PGHOSTADDR` and `PGSERVICE` survive into the spawned subprocess despite an otherwise valid disposable URL. This exposes an **uncontrolled destination-selection surface**; it does not itself demonstrate connection to a different real server. Use an explicit, minimal libpq environment / connection configuration, reject conflicting redirecting `PG*` variables, and preserve TLS verification with a trusted endpoint. Test direct and allowed pooler transport and the actual selected remote project identity; do not rely solely on lexical URL checks.

**Mandatory negative-regression additions before PROVE_PLAN/EXECUTE:** unchanged filenames but mutated SQL bytes; valid hash of unauthorized commit; forged/reordered duplicate 0026 or skipped 0058; injected `\\connect`/`\\!`/external-loading psql meta-command; inherited `PGHOSTADDR`/`PGSERVICE`/`PGOPTIONS`/conflicting `PGSSLMODE`; invalid TLS; failure before COMMIT; transaction rollback leaves old test schema intact. The tests must verify the concrete command and connection identity, **not only that spawn was called**.

**Disposition:** do not attach the local prototype to the workflow, do not grant `executionAuthorized=true`, and do not delete the reusable disposable schema while either blocker is open. Integrate fixes into the existing Fresh Install proof/contract-hash authority under a genuine, new F6-U03 Development Guard. This plan amendment is **documentation only** and is not itself a Plan Before Code PASS.

## 2026-10-15 offline hardening result (no repository-gate or database proof)

A replacement **OFFLINE-ONLY** F6-U03 prototype was built and executed in an isolated local sandbox with **14/14 Node.js tests PASS**. It is provided in the conversation artifact `F6-U03-hardened-offline-candidate.zip`, **not** added to this GitHub implementation branch. The offline runner contains an immutable `EXECUTION_ENABLED=false` stop, so it cannot perform target schema mutation.

Against synthetic disposable Git fixtures the hardening now:
- Pins all **59** migration paths plus Auth bootstrap, seed and pre/postflight files by Git blob content to the existing **reviewed 6a29778b6ea971f42fe25eb26181b192a97ab23d** ancestor. Any source byte/file-set drift blocks; a newly calculated checksum of unreviewed sources is not accepted by itself.
- Rejects synthetic SQL tampering with unchanged filenames, extra migrations, fake reviewed commit and psql meta-command injection.
- Enforces exact Fresh Install connection/role/host reference; requires `verify-full` TLS with a configured trusted CA file, rejects inherited `PGHOSTADDR`, `PGSERVICE`, `PGOPTIONS`, conflicting `PGSSLMODE` and other `PG*` variables, and constructs a minimal process environment.
- Confirms proposed single-transaction statement ordering, leaves `storage` managed tables untouched, and preserves exact 2026-10-15 object/neutral-catalog data fingerprints.

**Limitation:** synthetic Git test pass does not prove repository Development Guard, Plan Before Code, exact-head CI, PostgreSQL fault rollback, live TLS/project binding, Supabase provider integrity, 59 real SQL migration replay, authenticated Alap/Pro behavioral isolation or Completion Truth. The runner's execution path is intentionally **not implemented/authorized**. Integration requires a full genuine repo checkout and a new F6-U03 plan passing the original guard; do not silently manufacture a PASS with a sparse/mock checkout. The real Fresh Install target remains unchanged/occupied; no reset was attempted.

## Immediate resumable work

1. Confirm this plan and its actual source/authority dependencies under the existing Development Guard/Plan Before Code workflow for a **new** F6-U03 release unit; do not reuse closed F6-U02 `quality/development/active-plan.json` authority.
2. Implement targeted guard and atomic replay opt-in, plus automated negative tests and deliberate fault-injection. Validate exact-head CI, Completion Truth and Lifecycle.
3. Only then run the authorized disposable target proof. If runner/dispatch access is unavailable, leave the target unchanged, record the precise executable handoff and stop rather than performing an unpaired SQL wipe.
4. Continue existing Core #1186 until behavioral Office RLS and tenant/plan closure are proven. The separate #1307 roadmap PR is nonblocking documentation work only and must not reorder Core execution.

## Sign-off

This document records the PO's continuing intent and a candidate safe plan. It does **not** assert approval of a specific executable SQL reset, passing Plan Before Code, verification of the candidate replay implementation, or any database modification.
