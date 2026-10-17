# Core #1186 / #1228 — F6-U03w executable Office forward SQL package

Date: 2026-10-17. Stacked on #1407 head 8e5d6c08921d2c52e4cfa20fa83764854d2a9418. DRAFT only, no merge or managed execution.

## What changed
This unit creates the **actual SQL release-candidate package**, rather than another status checker. F6-U03r has previously tested an occupied PostgreSQL 17 0046→0058 upgrade and rollback on a disposable database. F6-U03w derives *exactly* 31 ordered, source-SHA-pinned 0047–0058 files from the F6-U03s canonical 78-source Git manifest and emits an executable single transaction. No source SQL body is reimplemented or copied into a separate hardcoded migration.

The transaction contains BEGIN, a strict lock_timeout and statement_timeout, the existing source-exact F6-U03f full 0046 guard (full 4621-object schema MD5, providers, neutral data, exclusive locks, no application customer rows), 31 original forward SQL source bodies, postflight 0048 table/privacy/plan policy and no-new-user/no-ledger-change checks, then COMMIT.

CI proves the source and package assembly but does not run it on hosted Fresh Install. The package is never marked authorized and contains no connection information. It can be locally reviewed as an SQL artifact. The original 0046 managed migration ledger remains empty; this script NEVER fabricates historic migration rows.

## Why deployment still cannot be treated as authorized
The 0046 managed baseline's historical migration provenance is not yet independently reconciled with the empty Supabase schema_migrations ledger. Existing app-scoped encrypted PostgreSQL archive recovery proved only a local restore; off-platform owner custody of the matching private key and full managed Supabase Auth/Storage/PITR recovery remain unverified. Fresh Install has zero Auth users and no managed signed JWT/PostgREST tenant proof. Office 0047–0058 creates new auth-related role policies and must be released through a separately approved operator-supervised protected change with real backup/restore and later Auth tenant fixtures. The presence of this executable SQL in Actions is not approval.

## Explicit non-actions
No hosted SQL/DDL/DML, Supabase migration stamps, Auth user/tenant seeding, staging reactivation, new paid resources, template development or PR merging. Issues #1186 and #1228 stay OPEN. The next controlled step is OWNER-backed recovery readiness and migration baseline adoption decision, then supervised database cutover and provider-issued JWT acceptance proof.
