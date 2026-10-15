# Core #1186 — F6-U03g real PostgreSQL17 positive guard fixture

**2026-10-15. Draft PR #1334, stacked on F6-U03f PR #1323, then #1322/#1321/#1319/#1317/#1308/#1304.** This is a *synthetic same-size* database test, not a canonical 0046 historical reconstruction or a hosted Supabase reset.

## Purpose

Prior F6-U03f added a source-only transaction guard with 177 application table locks, seven immutable historical entitlement catalog row digests, Auth/Storage/DDL/ACL checks and a 4621-entry schema fingerprint. Its dedicated PG17 negative test intentionally used an incompatible schema and verified fail-before-DROP. It did **not** prove that the lock and table-row logic can pass on a populated, structurally valid 177-table database.

F6-U03g provides real PostgreSQL17 positive and negative behavioral checks of that **table lock + neutral catalog row-hash mechanism**, without reproducing or asserting the 4621 original objects, six real Supabase event functions, Auth/Storage provider metadata, reviewed 59 original migrations or signed-in Alap/Pro Office RLS.

## Implementation and safety

- `scripts/shoperation-f6-u03g-positive-guard-fixture.mjs` imports the canonical F6-U03f `NEUTRAL_ROWS` names and row counts and requires the real parent `TRANSACTION_GUARD_SQL` to use `ACCESS EXCLUSIVE MODE NOWAIT`. This is a separate **behaviorally analogous guard**, *not byte-identical execution* of all production catalog and provider guards.
- Generates only `f6u03g_public`, `f6u03g_private`, `f6u03g_meta` namespaced objects in an isolated PostgreSQL17 database `f6_u03g_fixture`. Creates exactly 175+2 application tables and seven explicitly allowed neutral catalog tables populated with **113 synthetic** test rows; all other application tables begin empty.
- Separately stores the expected synthetic whole-row ordered JSONB MD5 fingerprints in a fixture-only metadata namespace. Transactional guard first checks DB/version, relation totals, takes an advisory transaction lock and then `ACCESS EXCLUSIVE NOWAIT` on every application table in stable order. While locks are held, it checks all 7 table hashes and rejects any non-neutral records.
- Adversarial SQL: (a) edit an existing neutral row without changing count; (b) insert customer-equivalent row in a private application table; (c) delete one table; (d) add one extra table; (e) hold a genuine `ACCESS SHARE` lock on a fixture table in a separate PostgreSQL session, causing the exclusive NOWAIT guard to reject. Each failure must be a PostgreSQL error with preserved original modified fixture state; a clean guard must pass before and after fault tests.
- CI [`.github/workflows/f6-u03g-positive-guard-fixture.yml`] provisions an **ephemeral PostgreSQL17 service** and has no Supabase secret or hosted connection. Driver rejects all inherited `PG*` and cloud DB selectors, requires `GITHUB_ACTIONS` and an isolated environment marker, compares DB/user/server major and actual Docker container IP before any fixture DDL. General CLI execution is disabled.
- Evidence contract is `LOCAL_SYNTHETIC_177_TABLES_ONLY`, containing 2 real successful guard transactions and 5 distinct SQL rejections. It declares `historical4621ObjectsProven:false`, `original59MigrationsApplied:0`, `hostedResetAuthorized:false`, `alapProRlsProven:false`.

## Limitations, non-authorization and dependency order

The synthetic digest values represent rows generated inside the fixture, **not** the actual seven historical catalog MD5 values. The full original historical guard and full customer baseline are not applied to this fixture. The real Fresh Install project ref `istjjkdcvsvilrycqecd` still contains the historical 175 public + two private app relations as previously observed, and must be rechecked fresh before any eventual operation. The other active Supabase project `waterk-platform` and paused `waterk-staging` must never be affected.

The existing F6-U03b immutable 59-file compiler still contains the deliberate `FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED` exception **before** any `DROP SCHEMA`. Do not remove that barrier, do not change Supabase project states, do not merge stacked drafts out of order and do not attribute fixture success to provider-managed PostgREST or authenticated Office behavior.

Canonical Development Guard for F6-U03g: `DEV-90EB737A`, risk 4/5, 45 known failures; require exact-head Plan Before Code, Quality Tests, TypeScript, production build, Completion Truth and Lifecycle plus the separate real PG17 workflow before this *scoped* unit may be closed.

**After F6-U03g:** plan the exact reviewed 0046 historical schema recreation in a disposable, isolated PG17 provider-compatible harness, including transactional grant restoration, concrete provider dependency behavior, and 59-file guarded replay. Actual hosted Fresh Install reset remains BLOCKED until separately authorized and supported by full target, TLS, managed-service and backup evidence.
