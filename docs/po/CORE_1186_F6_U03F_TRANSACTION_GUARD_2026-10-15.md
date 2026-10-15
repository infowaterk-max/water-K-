# Core #1186 — F6-U03f Transaction-local Fresh Install safety guard

**2026-10-15. Source-only review/negative PG17 fixture. No hosted SQL execution.**

## Roadmap and ownership

Successor to #1322 F6-U03e (final exact-head CI SUCCESS), stacked draft PR #1323, with earlier chain #1321 → #1319 → #1317 → #1308 → #1304 still unmerged. Existing Core before Builder/Template Factory roadmap order remains. No new Capability Registry/Control Plane authority or new active Supabase project.

Supabase Fresh Install ref: `istjjkdcvsvilrycqecd` (ACTIVE_HEALTHY); platform active, staging paused. This target binding is a **connector/outside-database responsibility**: SQL checks `current_database()='postgres'`, `current_user()='postgres'`, PostgreSQL17 but those values are **not unique to this Supabase project**. An approved future hosted connector must prove project endpoint/TLS identity before any SQL.

## Real read-only snapshot and reason for work

The selected Fresh Install project still has 175 public + two private tables, zero Auth users/identities/sessions/MFA, zero Storage objects, and zero `supabase_migrations.schema_migrations`. Its seven allowed subscription/entitlement tables contain exactly 113 neutral records; all seven JSONB row-content MD5 digests have been independently verified by a read-only Supabase query.

F6-U03d found the exact `auth.users.on_auth_user_created → private.handle_new_user()` external trigger dependency, exact public/private ACL arrays and six managed event trigger functions. F6-U03e proved namespace ACL restoration and DDL event rollback in an isolated PostgreSQL17 fixture. Both proofs are necessary, but neither alone authorizes a hosted deletion.

## What F6-U03f changes

`scripts/shoperation-f6-u03f-target-transaction-guard.mjs` creates a *source-only* PL/pgSQL safety fragment. The existing `scripts/shoperation-fresh-disposable-reprovision.mjs` places this fragment inside its reviewed `BEGIN` transaction **BEFORE** the unconditional `RAISE EXCEPTION 'FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED'`, itself **BEFORE** any `DROP SCHEMA` candidate.

The new guard performs:
1. Database, current role and PostgreSQL major version verification; bounded transaction advisory lock.
2. Exactly 175+2 expected application relations; deterministic `ACCESS EXCLUSIVE NOWAIT` locks over every nonpartition public/private owned table.
3. On the same connection and inside the same transaction, re-reads the canonical managed-schema snapshot: Auth identity/session counts, four unchanged Storage buckets, seven app entitlement hashes, known external Auth dependency, exact schema ACLs and six event trigger function hashes.
4. Iterates all owned application tables; requires zero customer/Office rows in all non-neutral tables; hashes each permitted neutral table's entire JSONB row set and compares historical expected digests, not merely counts.
5. Fails closed on unexpected tables, row data, changed ACLs, provider event triggers, Auth/Storage objects, or lock contention.

The guard also contains a **4621-item application schema definition hash check** for functions, RLS policies, triggers, indexes, constraints, relations and columns. This hash was revalidated separately on Fresh Install with a read-only Supabase query: `e312b40ad91150ce937f4aa00db587f3`. **The combined guard has not been executed successfully inside a real hosted transaction**, and application locks still cannot freeze every provider-managed write. These remain explicit critical gates. Most importantly, the F6-U03b unconditional abort remains enabled and there is still no hosted reset runner, SQL connection or migration application in these changes.

## Live execution remains blocked

`.github/workflows/f6-u03f-transaction-guard-proof.yml` creates a disposable PostgreSQL17 service named `postgres`, introduces an intentionally mismatched public sentinel table, assembles the exact existing 59-file review SQL offline, and requires a PostgreSQL **failure before DROP** plus preservation of the sentinel row. This verifies reject-first behavior only, not a successful guard on the actual 177-table Supabase historical schema.

The workflow has no hosted Supabase credentials. It does not run on the actual Fresh Install database, does not touch platform or staging and is not proof of an eventual 59-file migration replay.

## Further mandatory proof before actual customer baseline replay

- A separately governed connection path must certify the **exact Fresh Install endpoint and TLS peer** and ensure no inherited libpq address-selector/env redirects, independent of SQL `postgres` role and DB name.
- The now source-pinned 4621-item definition hash and provider-managed Auth/Storage/dependency snapshots must be exercised together in a controlled transaction, with independently governed quiescence. Its source inclusion alone is not hosted proof.
- Source-pinned 59 reviewed migration files, Auth bootstrap, neutral seed, and exact public/private schema ACL regrant must all be assembled and tested for failure rollback on disposable exact-schema state before any live execution switch.
- Provider-owned event triggers and PostgREST Data API schema cache/role access require genuine postflight evidence.
- Signed-in Alap/Pro/tenant-isolated Office flows and RLS negative proof remain mandatory after eventual successful hosted replay.

**Truth:** Completion Truth may verify *F6-U03f source and negative fixture guard*, not actual hosted 59 migrations, finished Fresh Install, provider acceptance or Alap/Pro Office readiness. In no event should a generic `folytassuk` command by itself authorize deletion of previously deployed schema.