# Shoperation Core #1186 / #1228 — F6-U03v independent fixture row and role state

Date: 2026-10-17. Direct parent PR #1406 exact head 1cf87091f70813f64f8f31a3997757d80bf7125f. DRAFT stacked only.

## Technical gap and evidence limits
F6-U03u prepared live Supabase Auth GET and PostgREST GET, but an empty PostgREST result is not proof that its target row exists or that a former role was actually revoked. Use an independently gathered, strictly **READ-ONLY** PostgreSQL17 observation to verify the fixtures.

The shoperation-f6-u03v-fixture-lineage.mjs source reuses F6-U03u's fixture identity validation and emits:
1. A metadata-only SELECT preflight: current database/version, Auth-user count, Office 0048 participant table presence, Office RLS flags and migration ledger row count. Safe to run against the currently empty Fresh Install.
2. Only after 0048 and 3 pre-existing users are resolved, an exact-four-thread / two-store / three-actor count-audit SELECT: verifies store isolation, active Alap/Pro plans and owner roles, a former revoked Pro role with zero remaining active bindings, positive Office participants, Alap customer feature and Pro advanced entitlement.

Both probes are SELECT-only and never sign in, seed users, alter grants, backfill migration history or execute Office migrations. Owner-controlled fixture UUIDs must be kept out of GitHub; locally emitted fixture SQL is written with permission mode 0600. CI archives only fixture-free prerequisite SQL.

## Truth boundaries
- All 16 count fields matching a bound fixture is only caller-bound application-row state evidence. It does **not** cryptographically attest connector authority, 0046 migrations, a Supabase-signed JWT, PostgREST RLS enforcement or provider-managed recovery; reports remain releaseAuthorized=false.
- Mocked observations are not provider receipts; source-only CI cannot claim live acceptance.
- Actual Fresh Install: 0 Auth users, missing Office 0048 participants, migration ledger 0. So fixture SQL is BLOCKED until a separately authorized release safely provides the schema and external test users.
- Historical 0046 hosted catalogue parity is not migration lineage. Owner backup key custody and Auth/Storage/PITR recovery are distinct blockers.

Next, after separate authorization and full backup: establish accurate managed SQL history, schema, and approved non-personal test fixture state. Perform read-only observation then separately run F6-U03u live GET under explicit user approval. No hosting write, staging activation, paid project, merge, Builder or Template work in this unit.
