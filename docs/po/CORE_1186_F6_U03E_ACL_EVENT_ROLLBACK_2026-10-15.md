# Core #1186 — F6-U03e: isolated PG17 namespace-grant and DDL-event transaction proof

**2026-10-15. Draft PR #1322, stacked on #1321 → #1319 → #1317 → #1308 → #1304.** The parent F6-U03d read-only managed dependency gate is exact-head CI-verified; this is the NEXT discrete critical-risk release unit, not a parallel Control Plane.

## Actual Supabase read-only observations

The selected `Shoperation Fresh Install` project is `istjjkdcvsvilrycqecd`, active and distinct from `waterk-platform` (active) and `waterk-staging` (paused). The historical application schema contains 175 public and 2 private tables; no Auth users, no Storage objects. The only confirmed external dependency points from `auth.users.on_auth_user_created` to `private.handle_new_user`.

Schema grants observed on the live PostgreSQL17.6 target:

- `public` owned by `postgres`: `postgres=UC`, `anon=U`, `authenticated=U`, `service_role=UC`, `supabase_admin=UC`.
- `private` owned by `postgres`: `postgres=UC`, `authenticated=U`, `service_role=U`.

The older, intentionally **non-executable** F6-U03b transaction review candidate drops and recreates these schemas without regrants: **not safe for use**. F6-U03e tests the isolated future regrant contract but does not activate that script.

All six `supabase_admin`-owned event trigger function definitions were read via a **SELECT-only** Supabase connector query. Observed `pg_get_functiondef` MD5 values (not authorization fingerprints): `issue_graphql_placeholder=8da9dff6b2ae47498209d341acaeb60b`, `issue_pg_cron_access=53a44336da0ac1dd62d89dbd988e6d1d`, `issue_pg_graphql_access=0c16c9ca00598b032d420b133f97d122`, `issue_pg_net_access=1d06ef4fb47bb0ab6e6f8818a62013bb`, `pgrst_ddl_watch=afaad7193dcf8f81e728d2bedb85e43e`, `pgrst_drop_watch=4357772baf5cfcd5c6d7049585b3a537`.

The PostgREST DDL and drop handlers call `NOTIFY pgrst, 'reload schema'` on relevant non-temporary DDL. That is a refresh **signal**, not proof of successful Data API schema-cache reload, a safe provider reset, or valid authenticated RLS.

## Separate, executing fixture — **not** Supabase

`scripts/shoperation-f6-u03e-schema-restore.mjs` contains only hardcoded fixture-prefixed `f6u03e_*` schemas and synthetic `f6u03e_*` roles. The `GRANT USAGE` to anon/authenticated analogues and `GRANT USAGE, CREATE` to service/admin analogues model exactly the observed public namespace semantics; private namespace grants USAGE to authenticated/service analogues only. It also checks **forbidden CREATE** on low-privilege roles and private namespace.

`.github/workflows/f6-u03e-schema-restore-proof.yml` provisions a separate ephemeral PostgreSQL17 GitHub Actions Docker service, a local database named `f6_u03e_fixture`, and only a known throwaway test password. **No Supabase URL, user token, secret or production privilege is supplied.** The runner checks the exact Docker network address, local database, role and PostgreSQL major version *before* any fixture DDL. Inherited `PG*` selectors and hosted `DATABASE_URL` values are forbidden. Normal CLI calls refuse execution.

The fixture has a separate Auth-like users relation with a trigger dependent on a function in the fixture private schema. The fixture creates two local PostgreSQL event triggers that insert transaction-scoped `CREATE`/`DROP` audit entries. They are **models only**: the six actual Supabase provider event handlers are **never executed** in this workflow.

A fixture run must exercise four injected faults (`AFTER_DROP`, `AFTER_REGRANT`, `AFTER_AUTH`, `BEFORE_COMMIT`) plus a deliberate `MISSING_GRANT` negative case. After every failed transaction the original row, external Auth-like trigger, exact semantic grants and audit count must all survive. A positive transaction must commit a new row and reconstructed trigger and event-audit entries, with the expected low-privilege role restrictions. Tests in `tests/shoperation-f6-u03e-schema-restore.test.ts` also check fixed identity, grant scope, and SQL sequencing.

## Claims and release limits

Evidence can at most say `LOCAL_POSTGRES17_ACL_DDL_EVENT_FIXTURE_ONLY`. Even a PASS means **zero actual customer-baseline migrations** were applied to Supabase. Actual managed Supabase Auth/Storage event side effects, schema cache refresh, PostgREST role access, transaction-scoped row/extension fingerprint guards, exact 59-file hosted replay and signed-in Alap/Pro Office tenant RLS proof remain unverified.

This PR **must not** remove F6-U03b's abort-before-DROP statement, mutate any connected project, create another active Supabase project, merge an upstream draft out of order, or claim Hosted Fresh Install READY.

Development Guard F6-U03e `DEV-9901C962` PASS at base `7d3439be97f9aae64d03658dac2e8b4e954d65ff` with critical-risk Plan Before Code requiring 8 adversarial challenges and 4 specialist roles. Standard exact-head Quality Tests, TypeScript, build, Completion Truth, Lifecycle and independent PG17 fixture proof are necessary before scoped closure.

## Next permitted work after this unit

Build an exact inside-transaction, authenticated target preflight for data/catalog/drift, author and verify the **actual** namespace ACL restoration in a future still-disabled 59-file replay candidate and separately prove provider callbacks/API behavior under a one-project-only governed execution design. Keep any actual hosted reset BLOCKED until these higher-risk obligations are verified and deliberately authorized.
