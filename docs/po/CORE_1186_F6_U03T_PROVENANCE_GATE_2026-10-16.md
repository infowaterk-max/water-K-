# Shoperation Core #1186 / #1228 - F6-U03t legacy catalogue provenance gate

Date: 2026-10-16. Parent: DRAFT #1400, exact parent HEAD 33c557d3b7e74faeeba7b41c0b223cc03ba9704d.
Scope: read-only managed 0046 catalogue parity, NOT managed Office migrations and NOT full application acceptance.

## Source and PostgreSQL proof
- Reuse canonical F6-U03s immutable 78-original source authority: 47 historical 0046 plus 31 unchanged forward 0047-0058 Office SQL.
- Reuse existing F6-U03g complete definition catalogue SQL, in turn sourced from canonical F6-U03f. Expected 4621 definitions with hosted MD5 e312b40ad91150ce937f4aa00db587f3. This is only a known hosted-catalogue reference, not proof of original source migration lineage.
- Actual disposable PostgreSQL17 occupied 31-source migration and rollback with late injected failure: Actions 38886502348. Encrypted application-scoped PG17 native dump and restore: Actions 38942232452. Neither proves live provider Auth/JWT/PostgREST nor full PITR.

## Latest managed observation
Only project istjjkdcvsvilrycqecd; independent Supabase connector read-only query 2026-10-16: complete 4621 definitions and expected MD5, 175 public plus 2 private tables, zero Supabase migration rows, zero auth users, modern Office participants absent.

## Code contract
- Source module scripts/shoperation-f6-u03t-provenance-gate.mjs builds strictly SELECT-only SQL from existing canonical object definition compiler and evaluates a caller-provided, fresh connector-bound observation. It never connects independently to a database, applies migrations, creates identities/tenants, alters ledgers or authorizes release.
- Reject wrong project, malformed or stale/future time, forged source manifest, changed catalogue fingerprint, unexpected ledger and premature 0048 markers. A successful legacy fingerprint can ONLY result in BLOCKED_PROVENANCE_AND_PROVIDER_PROOF and releaseAuthorized=false.
- CI emits only SELECT metadata query and original-source digest attestation; does not contain any DB URL, cipher backup or recovery private key.

## Release blockers
1. Zero-row Supabase migration ledger cannot attest 0046 source provenance; never invent/backfill migration stamps.
2. Owner held private-key storage external to ChatGPT and separate recovery authorization remain unconfirmed.
3. No live Supabase-signed JWT, PostgREST Alap/Pro tenant grant/denial/revocation journeys because there are zero Auth users and no test tenants.
4. Logical app pg_dump does not establish provider-managed Auth/Storage/PITR recovery. Require a future separately-approved guarded managed release transaction before 31 forward Office migrations.

Decision: RELEASE BLOCKED. The scoped diagnostic may close with exact-head CI, but #1186/#1228 stay OPEN, PR DRAFT, main and staging unchanged, Core before Builder/Template.
