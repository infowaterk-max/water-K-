# Core #1186 · F6-U03c — Real PostgreSQL transactional rollback rehearsal

**2026-10-15. Scope: EPHEMERAL POSTGRESQL SERVICE ONLY. This is not the live Supabase Fresh Install.**

## Why

F6-U03b PR #1317 (head `ff6f7d7f715551213c5dd24d36edbd0f3a8abb19`) delivered a source-pinned, offline-only guarded 59-file SQL candidate with an unconditional abort **before** any `DROP SCHEMA`. It passed ordinary exact-head CI, but no actual PostgreSQL rollback was proved.

F6-U03c adds genuine PostgreSQL16 transaction/failure-injection behavior proof **without taking any risk on the hosted Fresh Install database**. It is tracked by draft PR #1319, stacked on #1317, in the same Core #1186 F6 workstream. Development Guard `DEV-9901C962` PASS, 4/5 projected risk, 22 Known Failures; separate Plan Before Code/CI and Lifecycle closure required.

## Exact test boundary

- `.github/workflows/f6-u03c-postgres-rollback-proof.yml` creates **one ephemeral PostgreSQL16 service** with disposable local database `f6_u03c_fixture`. The job has `permissions: contents: read`, no cloud database secret and no Supabase connection. Its password is a known, ephemeral CI fixture value, **not** a production credential.
- `scripts/shoperation-f6-u03c-rollback-rehearsal.mjs` refuses ordinary CLI execution and inherited `PG*`, `DATABASE_URL`, `SHOPERATION_FRESH_INSTALL_DB_URL` and `SUPABASE_DB_URL`; it constructs a minimal `psql` environment and explicitly requires PostgreSQL16, user `postgres`, exact DB `f6_u03c_fixture`, and TCP loopback `127.0.0.1` **before any fixture DDL**.
- All `DROP SCHEMA` targets are namespace-prefixed **`f6_u03c_private`/`f6_u03c_app`**, never `public`, `private`, `auth`, `storage`, `realtime` or Supabase internal schemas. Fixture `f6_u03c_auth.users` intentionally holds a trigger that depends on `f6_u03c_private.on_user`, emulating the real historical cross-schema Auth trigger dependency.
- Every trial starts with the same old application row and external trigger, executes real `BEGIN; DROP SCHEMA ... CASCADE; CREATE ...; COMMIT;` candidate DDL with `psql -X -v ON_ERROR_STOP=1`, and examines PostgreSQL state afterwards through a fresh connection.
- Seven deliberately injected SQL exceptions at `BEFORE_DROP`, `AFTER_DROP`, `MIGRATION_0001`, `MIGRATION_0058`, `AUTH_BOOTSTRAP`, `NEUTRAL_SEED` and `POSTFLIGHT` each require **nonzero error** and complete restoration of the old row, dependent external trigger, function and auth-equivalent table. The separate positive path requires a real successful COMMIT with the new row and recreated trigger.
- `tests/shoperation-f6-u03c-rollback-rehearsal.test.ts` enforces the fixed fixture-only transport and SQL source boundaries. The **dedicated Postgres service job**, not those mocked/unit checks, is the authority for the actual rollback claim.

## Evidence and limitations

The dedicated CI job must publish an exact-head artifact with explicit scope `LOCAL_POSTGRES16_TRANSACTION_ONLY`, seven fault outcomes, one committed outcome, and `supabaseTouched:false`, `actualCustomerBaselineMigrationCount:0`, `hostedFreshInstallProof:false`, `alapProRlsProof:false`. A skipped, timed-out or failed service job remains **BLOCKED**, regardless of ordinary CI result.

Even a complete local Postgres PASS **cannot** certify the 59 original customer-baseline SQL files on hosted Supabase, provider-managed Auth/Storage dependencies, exact project/TLS identity, a comprehensive schema/row catalog guard inside the same hosted transaction, connection loss near COMMIT or genuine signed-in Alap/Pro Office tenant/RLS behavior.

The original Fresh Install project `istjjkdcvsvilrycqecd` remains active with a previously deployed 0046 schema, not a verified clean target. The old four Storage buckets must stay under Storage provider authority. No hosted migrations or destructive reset are authorized by this release unit.

## Continued delivery order

1. F6-U03c canonical Development Guard + Plan Before Code, implementation, real local PostgreSQL16 fault proof, exact-head ordinary CI/Completion Truth/Lifecycle.
2. Independent, critical-risk F6 controlled hosted identity/transaction guard and full rollback fault-test implementation — only after concrete review and authorization of the target and safe transactional replay; old F6-U03b abort barrier must not be casually removed.
3. Actual dedicated Fresh Install target preflight, 59 reviewed customer-baseline migrations, auth-bootstrap, neutral seed, postflight, tenant/actor role and Office Alap/Pro behavioral proof.
4. Close the stacked PR chain under the accepted roadmap and repository lifecycle gates before moving to another Core block. Builder and Template Factory stay downstream.

**This document records engineering acceptance scope, not a PO-approved production data deletion or a claim of hosted readiness.**
