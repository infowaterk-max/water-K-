# Shoperation Core #1186 / #1228 — F6-U03x single 0046 baseline ledger / Office 31-source integration

2026-10-17. Parent draft #1414 exact HEAD 7a6aa4307985d21581fd9969c28a425d17b08ee5, preserves the source-identical previously completed sibling draft #1411 and #1412 files in a new integration branch. No merge into main.

## Actual release blocker corrected (source only)

Sibling #1411, although its source-only 31 Office originals pass CI, checks migrationHistory=0 and enforces zero rows in supabase_migrations.schema_migrations after Office 0047–0058. Sibling #1412/#1414 requires separate future adoption of exactly ONE reviewed 0046 current-state schema snapshot as a Supabase baseline history entry. The package would previously fail after correctly registered baseline adoption.

New scripts/shoperation-f6-u03x-office-ledger-integration.mjs consumes the exact immutable 31-source #1411 package and rewrites ONLY its two release-package ledger assumptions from zero to one. It preserves the original F6-U03f neutral catalog, cross-schema provider, ACL, event, storage and 4621-definition MD5 checks, all 31 git SHA-bound original Office SQL bodies, bounded locks and transactional rollback. All original sibling files remain byte-for-byte identical.

A NEW transaction-local ledger preflight locks supabase_migrations.schema_migrations in SHARE MODE NOWAIT, requires exactly one row with the exact separately approved baseline version and name, and stores the row's full JSONB fingerprint in a transaction-local PostgreSQL setting. A NEW transaction-local postflight verifies exactly one row with the exact baseline identity and identical row fingerprint after all 31 source SQL migrations. Missing/foreign/extra/stale/tampered record fails the transaction before COMMIT. No 47 fictional stamps are added and the old developer-era supabase/migrations chain must not be pushed.

An input example version 20261017180000, name shoperation_managed_0046_current_state, and SHA256 all a characters is SYNTHETIC TEST DATA, not a real reviewed schema dump, owner authorization or managed ledger receipt. The emitted SQL BLOCKS on current managed Fresh Install because remote history remains empty. The operator must replace the test identity with the actual separately approved and reviewed snapshot version/name/hash before release consideration. The SHA field itself is only an input identity; this module neither validates a private snapshot's contents nor writes its remote history. Exact-head CI/native PG17 tests prove only bounded source package and ledger semantics, NOT a real complete hosted Office migration.

## Real release sequence

1. Independently secure owner-held matching AES-256-GCM/CMS recipient PRIVATE KEY; verify owner-side decrypt and restore, account for Supabase Auth/Storage/PITR separately. Prior encrypted public GitHub artifact is not standalone proof of usable recovery.
2. Export reviewed managed current 0046 schema snapshot securely to an isolated non-public workspace; prove neutral source and reproducibility in disposable PG17, separately from historical 47 SQL and hundreds of developer-era migrations. Confirm original historical masked Oct 9 DB URL target identity, or retain unproven status.
3. Obtain SEPARATE explicit owner authorization for a one-version current 0046 snapshot tracking adoption (a remote write) and independently verify the exactly one real schema_migrations row only on project istjjkdcvsvilrycqecd. Do not run automatic migration repair, never stamp 47 old versions.
4. Rebuild source-bound Office package with actual approved version/name/hash; recheck managed full catalogue, neutral rows, permissions, provider dependencies and owner recovery. Rehearse full forward/rollback in isolated PG17 before any separately authorized hosted execution. Native local ledger test is NOT real provider-RLS proof.
5. Only after authorized hosted migration and 3 real Auth fixtures, run signed JWT/PostgREST Alap customer/Pro internal/tenant isolation/grant/revocation acceptance. Keep #1186/#1228 open until proven.

## Strict scope and caveats

This DRAFT integrates three sibling source units into one code/test bridge. Original 0046 GitHub Actions artifact run 37919705159 attempt 2 job 113806799257 artifact 11613699688 was truly SHA-verifed in #1414, but historical masked DB endpoint cannot be proven from that receipt alone. Native PostgreSQL17 CI runs synthetic local ledger with positive and deliberately failing variants. No hosted SQL, Auth users, paid project, staging activation or merge. releaseAuthorized=false mandatory until owner-approved exact snapshot, off-platform decryptability, managed provider recovery and signed JWT/PostgREST proof. Core before Builder and Templates.
