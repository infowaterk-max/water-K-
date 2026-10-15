# Shoperation Core #1186 — F6-U03g real historical 0046 positive fixture

**2026-10-15 · Draft PR #1332 · strictly isolated PostgreSQL17. Never apply this fixture to Supabase.**

## Provenance and purpose

The earlier F6-U03f #1323 guard passed negative real-PG17 tests but **has not successfully accepted the true 0046 occupied database**. The historical source commit `03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4` passed the previous hosted Fresh Install baseline proof, and currently this project contains a schema corresponding to the 0046-era app objects: 175 public tables, two private tables, 344 public functions, 126 public policies, 4,621 catalog definitions, source-observed MD5 `e312b40ad91150ce937f4aa00db587f3`.

The customer baseline directory currently has 59 SQL files, but the approved 0046 proof selected **47** sources numbered 0001–0046, because there are **two distinct 0026** files. F6-U03g is exclusively the historical reproducibility harness; the Office/Pro 0047–0058 chain is excluded.

## Implementation

- `scripts/shoperation-f6-u03g-positive-fixture.mjs` deterministically selects these 47 files, reads their immutable bytes, calculates each SHA256 and ordered source-set SHA256, and emits one transaction SQL bundle. Its CLI **only writes files**, never connects to or changes a database.
- The `.github/workflows/f6-u03g-positive-fixture-proof.yml` job provides a dedicated short-lived **postgres:17** Docker service with a fixed local database `f6_u03g_fixture`, known throwaway credentials and an explicit Docker address/role/version check *before* any fixture SQL.
- In that database alone, a clearly limited stand-in `auth.users`, `auth.uid()`, `auth.jwt()`, `auth.role()`, Storage schemas, and `anon`/`authenticated`/`service_role` roles provides missing minimum provider primitives. These are **simulated components, not genuine Supabase managed services or identities**.
- Before the first historical migration, the SQL transaction checks exact local database/role/PG17 identity. With `psql -X -v ON_ERROR_STOP=1`, any SQL failure terminates the transaction without COMMIT; the connection then rolls back.
- After a full replay, SQL measures actual table/function/policy counts and computes the same 4,621-definition catalog fingerprint expression used in **the unchanged** F6-U03f guard, then attempts that guard as a transaction on the local replica without destructive DDL.
- `tests/shoperation-f6-u03g-positive-fixture.test.ts` rejects skipped/fabricated replay results and false guard PASS whenever canonical fingerprint or counts are wrong.
- CI artifacts retain migration stderr and full-guard error separately. A match on app counts **does not imply** provider Auth/Storage/Event/ACL equivalence.

## Critical truth boundaries

The actual F6-U03f guard includes six real Supabase-managed event-trigger function digests, original namespace ACLs, managed tables/Storage buckets and a raw PostgreSQL definition hash. A generic Docker Postgres installation cannot automatically reproduce those provider-managed components or original role OIDs. **A mismatch must be recorded as BLOCKED, not compensated by weakening the current guard or fabricating app tables.**

This harness attempts the *positive* scenario and reports the first genuine blocker if the historical SQL does not apply. It is not permitted to claim full guarded acceptance without actually running the unchanged F6-U03f SQL and satisfying its original checks.

Supabase documentation confirms that raw PostgreSQL dumps may include Supabase-managed schema/roles, while Supabase's migration/dump flow deliberately filters some platform-managed objects: [Supabase restoration guide](https://supabase.com/docs/guides/self-hosting/restore-from-platform); [local workflows](https://supabase.com/docs/guides/local-development/cli-workflows). Hence a direct Docker-only rehearsal cannot be treated as proof of hosted provider behavior.

**Remaining work after this stage:** solve any historical replay fixture prerequisites without modifying the reviewed migrations; demonstrate full guard positive on an environment that can reproduce all managed snapshots; then separately secure exact Supabase project endpoint/TLS identity, exclusive transaction-local quiescence, regrant, 59-file hosted replay with actual external provider behavior and signed-in tenant-isolated Alap/Pro Office RLS.

Existing F6-U03b **unconditional fail-before-DROP** remains enabled. No new Supabase project is activated. Platform and staging remain untouched. **A 'folytassuk' message does not authorize deletion of the deployed disposable schema.**
