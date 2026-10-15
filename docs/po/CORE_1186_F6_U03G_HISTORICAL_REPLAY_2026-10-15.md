# Shoperation Core #1186 F6-U03g — historical 0046 application-replay acceptance

**2026-10-15 · DRAFT #1329 · isolated PostgreSQL17 test only · NOT HOSTED READY.**

## What this release unit proves

Core F6-U03f (#1323) introduced the 177-table transaction-local Fresh Install guard but only exercised a negative scenario against an incompatible PostgreSQL fixture. The positive-path question is whether we can **actually recreate the old application schema** (the existing Fresh Install target is historical 0046) from the original immutable source and then validate the same application object definition/neutral catalog fingerprints.

This unit uses `supabase/customer-baseline/migrations/` unchanged: the complete source set contains **59** SQL files, of which **47** are part of the 0001–0046 historical replay because **two distinct 0026-prefixed files** exist. The snapshot `0001_shoperation_v1_schema.sql` is approximately 931 KB and includes dozens of real references to `auth.users`. A two-table artificial fixture would therefore not be a legitimate positive application-schema proof.

`scripts/shoperation-f6-u03g-historical-replay.mjs` compiles an execution stream using the actual `validateReviewedBaseline()` source lineage and original 47 migration files in order, plus original application Auth trigger bootstrap, all in one `BEGIN … COMMIT` transaction. **No individual migration is edited, skipped or retried to force success.** A minimal compatibility shim supplies synthetic `auth.users`, `auth.uid()`, `auth.jwt()`, `storage`, `extensions.pgcrypto` and local PostgreSQL roles required for DDL to parse. These are **not** the actual Supabase GoTrue, Storage, Realtime or PostgREST services.

After replay, the runner checks exactly 175 public and two private application tables, all application tables under `ACCESS EXCLUSIVE NOWAIT` (fixture only), zero rows in every non-neutral table, all seven historical neutral entitlement catalog hashes and the exact original application fingerprint `4621 / e312b40ad91150ce937f4aa00db587f3`. The fingerprint SQL is extracted **byte-identically** from the F6-U03f source projection (`CATALOG_SQL`); the immutable expected hash is not modified to fit a fixture.

The application preflight's `ROLLBACK` is intentional: it exercises exclusive-table locks and row reads with transactional semantics without making any further application change. The historical source migration itself commits only in the disposable local fixture.

## Safety and evidence rules

- The dedicated [F6-U03g GitHub Actions workflow](https://github.com/infowaterk-max/water-K-/actions/workflows/f6-u03g-historical-replay-proof.yml) creates one ephemeral PostgreSQL17 Docker container, with fixed `f6_u03g_fixture` database and known throwaway password; it has `contents: read` only, and **no Supabase secrets**.
- Before any SQL, the runner validates `GITHUB_ACTIONS`, a deliberate `F6_U03G_EPHEMERAL=yes`, expected *actual Docker container IPv4*, exact local loopback connection, `current_database()`, `current_user`, and PostgreSQL major version 17. Inherited `PG*` and hosted database URL variables abort.
- Success requires 47 original migrations, all table row checks, and an exact 4621-object digest. Any bootstrap SQL incompatibility, unavailable extension, changed source, or digest mismatch **BLOCKS** and retains the CI diagnostic evidence. The migration SQL is not rewritten or downgraded.
- Evidence scope is `HISTORICAL_0046_LOCAL_POSTGRES17_ONLY`; even an isolated PASS cannot verify 0058 Office SQL, 59-file hosted migrations, six managed Supabase event trigger functions, actual Auth/Storage/PostgREST provider behavior, TLS/project identity, or signed-in Alap/Pro/tenant RLS.
- The original F6-U03b compiled review candidate retains its unconditional `FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED` **before all DROP SCHEMA statements**. No hosted DDL, project activation, Auth data creation, or production deployments are allowed in this unit.
- This PR is stacked #1304 → #1308 → #1317 → #1319 → #1321 → #1322 → #1323 → **#1329**, and must not be merged outside that dependency order.

## Decision and next step

On exact-head SUCCESS of the isolated job, full Shoperation CI, Completion Truth and Lifecycle, the **historical application proof only** can be closed. If the PG17 fixture produces a genuine migration error or catalog drift, F6-U03g remains blocked until that difference is understood and corrected **without editing canonical sources or weakening reference fingerprints**.

The next safe critical unit must cover the remaining managed-provider/TLS/connection identity boundary, the actual current 0058/59-file chain and fail-closed rollback under an approved one-project-only execution authority, then actual authenticated Office Alap/Pro cross-tenant behavior. The existing Fresh Install project stays untouched until those requirements and explicit destructive-operation authority are met.
