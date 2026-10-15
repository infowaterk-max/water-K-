# Core #1186 · F6-U03g — positive transaction guard branch in isolated PostgreSQL17

**2026-10-15. Draft PR #1333; stacks on F6-U03f #1323 → #1322 → #1321 → #1319 → #1317 → #1308 → #1304.**

## Why this work is necessary

The F6-U03f source-only candidate now includes an exact 177-table/4621-definition historical Fresh Install guard, 113 neutral rows, seven neutral catalog MD5 values, Auth and Storage checks, schema ACLs, six Supabase provider event functions, Auth external trigger, and `ACCESS EXCLUSIVE NOWAIT` locks. Its first real PostgreSQL17 run proved only **negative** mismatch rejection before any DROP. A positive result from that guard's actual SQL execution path was not demonstrated.

This unit aims for an **executable positive branch**, with negative mutation tests, but exclusively in one ephemeral `f6_u03g_fixture` PostgreSQL17 GitHub Actions service.

## Fixture fidelity and explicit limits

The disposable fixture creates **175 public + 2 private tables** and populates all seven neutral catalog tables with exactly **113 synthetic rows**. It creates fake Auth/Storage metadata tables and four buckets, the expected cross-schema Auth-like trigger, exact public/private schema grants and six extension-owned event trigger names. This exercises the actual application table enumeration, locks, ordered row-content hashing, Auth/Storage absence checks, schema ACL predicates and dependency classification.

However, the fixture has **synthetic table layouts, function definitions, policies, indexes and event-trigger bodies**. It is **not** the original 4621 application object definitions and is **not** a true managed Supabase instance. The fixture does not test the actual 59 migration replay.

To execute the *original imported F6-U03f guard* successfully against that different schema, a separate, fixture-only adapter replaces exactly 15 expected values in a transient in-memory SQL copy: seven neutral catalog MD5s, six event function MD5s, one full object count and one object-definition MD5. Every substitution is named and included in the evidence. It does not alter the production source or make an executable hosted candidate. All other guard logic, including 177 locks, original data checks, tenanted-schema Auth dependency checks and ACL checks, remains imported and unchanged.

## Safeguards

- The fixture runner refuses normal CLI execution, any ambient `PG*` libpq selectors or hosted database URL, and requires GitHub Actions with an explicit ephemeral marker.
- It verifies the **exact** PostgreSQL database name `f6_u03g_fixture`, superuser, server major version **17**, and the network address of the Docker PostgreSQL service *before running fixture SQL*.
- The workflow contains no Supabase credentials or ability to access the real Fresh Install. The fixture's password is non-secret test data.
- One positive `BEGIN; DO $f6_guard$ ...; ROLLBACK;` run must complete without an error, exercising all 177 application table locks and data hash checks.
- Six negative mutations simulate non-neutral customer data, an equal-row-count neutral catalog change, lost public schema USAGE, Auth user data, Storage objects and a disabled provider-like event trigger. Each must be **rejected with the expected actual F6-U03f exception**, and an independent subsequent positive guard run proves rollback.
- The production `scripts/shoperation-fresh-disposable-reprovision.mjs` retains its unconditional `FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED` statement **before** `DROP SCHEMA private/public`. The 59 source files remain immutable and the hosted execution flag false.

## Evidence and remaining blockers

The dedicated GitHub job `.github/workflows/f6-u03g-positive-guard-proof.yml` must produce an exact-head artifact reporting `LOCAL_PG17_TRANSLATED_GUARD_POSITIVE_ONLY`, original and fixture guard SHA256, all 15 substitutions, positive outcome, six negative rejections, and zero Supabase operations or actual migrations.

**Even if PASS, this does not prove that the original unaltered guard succeeds on the existing hosted 177-table/4621-definition Fresh Install target**. Explicit separate authority is still required for unique hosted endpoint/TLS, complete transaction-local safe write quiescence, rollback and provider effects, exact original 59-file replay, PostgREST/role access and signed-in Alap/Pro Office RLS tenant isolation.

The original Shoperation `main` remains unchanged; stacked PR #1333 stays draft pending canonical exact-head Plan Before Code, Quality Tests, TypeScript, Completion Truth and Lifecycle.
