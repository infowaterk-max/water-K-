# Core #1186 — F6-U03d managed-schema dependency and ACL preflight

**Status: READ-ONLY REVIEW; hosted Fresh Install reset remains BLOCKED.** 2026-10-15.

## Authority, context and dependency order

Stacks on F6-U03c PR #1319 (exact closed CI head `74b1b617ec116fd3e94db35ffdb6df5cf93e0926`) → F6-U03b PR #1317 → F6-U03a PR #1308 → F6-U02 PR #1304. These drafts are not merged into `main`; no Core/Builder/Factory order changes.

Dedicated disposable Supabase project `istjjkdcvsvilrycqecd`, region `eu-central-1`, **ACTIVE_HEALTHY**. The other active project `waterk-platform` (`ewdederyvnwmghlydbno`) must never be targeted; `waterk-staging` (`rfuvzgumbardvbvqjxdq`) remains paused. Two active projects, one inactive.

Canonical Development Guard generated F6-U03d scope **`DEV-0959CFF4`**, risk 4/5 and 31 applicable Known Failures. Separate Plan Before Code, exact-head CI/Completion Truth/Lifecycle proof is mandatory. Design/proof concerns identified by engineering specialists are not external human signoffs.

## Verified read-only Supabase catalog observations

The `scripts/shoperation-f6-u03d-managed-preflight.mjs` constant `READ_ONLY_SQL` was executed via the Supabase connector against **the selected dedicated Fresh Install project only**, with no SQL DDL/write actions. PostgreSQL version **17.6**, connected database `postgres`, role `postgres`.

- Application schema: **175 public tables + 2 private tables** (occupied historical 0046-era state).
- Auth: **0 users, 0 identities, 0 sessions**. Storage: **0 stored objects, 4 provider-managed buckets**. Supabase migration-history records: **0**.
- PostgreSQL `pg_depend` read-only classification resolves the *owner schema* of triggers, views/rules, constraints, defaults, policies, relations, functions and types. Exactly **one** external dependency: `trigger on_auth_user_created on table auth.users` depends normally on `function private.handle_new_user()`.
- No additional external FK/view/function dependencies were returned by this classified query. This observation is a snapshot, not a guarantee of zero future drift.
- `public` schema: owner `postgres`; ACL entries `postgres=UC/postgres`, `anon=U/postgres`, `authenticated=U/postgres`, `service_role=UC/postgres`, `supabase_admin=UC/postgres`.
- `private` schema: owner `postgres`; ACL entries `postgres=UC/postgres`, `authenticated=U/postgres`, `service_role=U/postgres`.
- **Six enabled Supabase-managed event triggers** owned by `supabase_admin` in `extensions`: `issue_graphql_placeholder` (`sql_drop`), `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access` (`ddl_command_end`), `pgrst_ddl_watch` (`ddl_command_end`) and `pgrst_drop_watch` (`sql_drop`).
- Preserved Storage bucket metadata: `digital-products-private` private 2147483648, `order-documents-private` private 26214400, `product-documents-private` private 26214400, `product-media` public 8388608 (size limits in bytes).

## Blocking functional issue discovered

F6-U03b's **deliberately non-executable** SQL review candidate includes `DROP SCHEMA private/public CASCADE` and `CREATE SCHEMA private/public AUTHORIZATION postgres` but **does not contain explicit schema-ACL restoration**. On a live Supabase Postgres cluster, dropping a schema also destroys its schema-level grants; merely recreating the namespace with `CREATE SCHEMA` does not restore `anon`, `authenticated`, `service_role`, and `supabase_admin` grants. PostgREST Data API and authenticated user operations can therefore fail even if all 59 migrations apply cleanly.

The managed Auth trigger will be CASCADE-removed when `private.handle_new_user` is dropped; the reviewed `auth-bootstrap.sql` must restore it. Supabase-managed `sql_drop` and `ddl_command_end` event triggers can respond to DDL and require a separate tested safety specification. See [Supabase safe data deletion](https://supabase.com/docs/guides/database/postgres/data-deletion) and [PostgREST schema cache issue](https://supabase.com/docs/guides/troubleshooting/postgrest-error-pgrst002-could-not-query-the-database-for-the-schema-cache-c396e9).

## F6-U03d implementation and evidence contract

The source-only module exports the immutable, SELECT-only `READ_ONLY_SQL`, offline SQL digest and a **fail-closed static result comparator**. It will only report `REVIEW_ONLY`, and only when the connector project ref is explicitly the Fresh Install ref, the old schema/empty Auth state is unchanged, exactly one known external dependency is present, all role ACL strings match, all six managed event triggers match, and all four Storage buckets are unchanged.

It does not contain a hosted database runner, credentials, migration installer, `DROP SCHEMA`, `GRANT`, `REVOKE`, or permission for automatic cleanup. The isolated GitHub workflow may generate SQL and fixture assertions without any database secret but is **not** an actual Supabase preflight job.

Even a `REVIEW_ONLY` comparator PASS is **not a reset authorization**, because transactional locks, every-table exact row fingerprint, object counts, grant recreation, full event-trigger effects, after-replay PostgREST exposure and the 59 reviewed real migration replay still need independent evidence.

## Mandatory subsequent critical unit

Before any hosted schema reset can be proposed, the next F6 unit must:
1. Prove precise, transaction-local application schema/neutral catalog plus Auth/Storage and managed-reference rechecks under a bounded exclusive lock, and correct rollback after unknown dependencies or data drift.
2. Restore **exactly** the original public/private namespace ownership, ACLs and applicable provider API grants during the same atomic transaction, and verify all role permissions and Data API behavior after a successful replay.
3. Prove the six enabled event-trigger effects (especially `sql_drop`/`pgrst_drop_watch`) under controlled fixture tests and an independently authorized one-project-only execution plan.
4. Preserve the existing F6-U03b unconditional fail-before-DROP barrier until the full guarded hosted procedure is separately implemented, tested, and expressly authorized.
5. Apply only the immutable 59 reviewed baseline migrations, Auth bootstrap and neutral seed; confirm postflight plus real Alap/Pro signed-in Office/RLS tenant isolation. Never treat fixture-only proof as successful hosted proof.

**Explicit disposition:** `F6-U03D_READ_ONLY_REVIEW` may be closed by exact-head CI; `F6_HOSTED_RESET_READY`, `FRESH_INSTALL_PROOF` and `ALAP_PRO_OFFICE_BEHAVIOR` all remain **BLOCKED**.
