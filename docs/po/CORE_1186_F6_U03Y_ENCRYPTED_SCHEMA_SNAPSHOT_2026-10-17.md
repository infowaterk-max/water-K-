# Core #1186 F6-U03y — owner-key encrypted managed 0046 schema capture + native PG17 restore (plan-first)

Date: 2026-10-17. Base exact PR #1417 closing HEAD `b1195dfbf816aa4f7e25d967de4b95ac61ca6e20`. This DRAFT work MUST NOT merge or apply managed migrations.

## Scope and accepted operator intent

- Capture a **fresh live read-only** exact-project schema-only `public` + `private` PostgreSQL 17 custom archive from the dedicated `istjjkdcvsvilrycqecd` Fresh Install project, with native owner and grant statements retained; do not mistake application schema for provider-managed Auth/Storage/PITR recovery.
- Capture a *separate* read-only structured provider boundary receipt from the immutable canonical `scripts/shoperation-f6-u03d-managed-preflight.mjs` query, with provider event triggers, schema owner/grants, external auth.users trigger dependency, Storage bucket visibility/limits. This is a boundary inventory, **not** a full Auth/Storage schema archive.
- Derive schema source hash and canonical 4621-definition fingerprint from exact hosted catalog before and after export; require `4621|e312b40ad91150ce937f4aa00db587f3`. All 175 public/2 private tables; 0 auth identities/sessions, customers and ledger rows; 113 neutral catalog source rows.
- Reconstruct a **different, disposable** PostgreSQL 17 DB using the source-pinned local provider bootstrap then import **this captured archive**, then compare 4621 canonical definitions and RLS policies. This is app-owned schema restore proof only; provider-managed boundary not reconstructed.
- All snapshots are locally encrypted **on GitHub runner before artifact upload** using the exact RSA3072 owner public certificate fingerprint `8fb52aadb1fb2e5a35c678a535dcb3e1de31299eac86ab5eceec7f716f7a6e21`. Private key is off GitHub and held by owner. GitHub artifact contains ONLY AES-256-GCM CMS ciphertext, sha256 checksum and metadata that has no schema source or secrets. 14-day retention. No raw SQL or database URL in actions logs/artifacts.
- Do not ask for owner private key or print it; no hosted DDL/DML, Supabase migration ledger adoption, Auth seeds, paid projects, staging restore, production Vercel, root `supabase db push`, historical migration stamping or main merge.

## Risk and gate policy

Risk: critical (hosted database read access and sensitive structural export). Fail-closed on wrong host or TLS CA, PG major, any native catalog/ACL/provider drift, zero customer-state drift, missing key-matched public certificate, captured artifact verification or disposable restore variance. Reuse existing pinned Supabase 2021 CA and host allowlist logic from PR #1394; no password in stdout.

Expected proof receipt: exact GitHub SHA/run/job, target reference, source SHA256, canonical 4621 MD5, provider inventory SHA256, native PG17 schema import/parity, encrypted CMS SHA256 and artifact ID. If the managed snapshot can't restore independently, label the failure explicitly, **do not publish a PASS**.

A successful U03y capture does **NOT** authorize writing a new single-row Supabase migration baseline. That requires separate owner consent, provider-owned Auth/Storage/PITR restoration evaluation, schema review and version/name/hash binding. Issue #1186/#1228 OPEN, prior PR #1417 DRAFT, Digital Office unproven.

## Execution order

1. Plan-first commit. 2. Implement single strictly scoped GitHub Actions workflow. 3. Audit source trigger and host checks. 4. Run on exact feature branch; inspect run and encrypted-only artifact. 5. Owner retains encryption key and may verify locally. 6. Never execute ledger adoption without explicit authorization.

## 2026-10-18 — Verified snapshot-to-baseline handoff receipt

This appendix binds the **actually completed** owner-encrypted source snapshot to the pending current-state baseline adoption process, rather than reopening or relabeling the closed U03x development plan.

### Immutable source receipt, independently cross-checked

- Source run: https://github.com/infowaterk-max/water-K-/actions/runs/39112423047, full workflow and PG17 `native-backup` job **SUCCESS**, head `4598b6eab2ede305c5011b7479e283006559ef16`.
- Artifact #12130972644: `fresh-schema-owner-cipher-4598b6eab2ede305c5011b7479e283006559ef16`; expires 2026-11-01 09:45:17 UTC. Operator confirmed downloaded for offline custody. The GitHub artifact ZIP was independently read through the connected GitHub interface without decrypting the private contents.
- Artifact `cipher.sha256` equals SHA-256 actually recomputed from the ZIP's `fresh-backup.cms`: `3b791882cffcf3ae663e127afb5cf447ea06a5d49f1b258398fc93712a47b9d0`, 1,956,520 encrypted bytes. Only ciphertext + a non-sensitive receipt and checksum were published.
- Unencrypted **schema-only** `public` + `private` custom PG17 archive SHA-256 declared by the CI source proof (NOT independently decrypted locally by assistant): **`1b68d33aa7815a588572575a2ce20eb32c8953af14275dfb6577ca47faf92c73`**. Treat this as a **candidate** `snapshotSha256` for the F6-U03x identity envelope, not an approval of a baseline SQL migration.
- Provider boundary inventory SHA-256 declared by proof: `c2fcf6a60ef69a5acbd84c287451b61aad3888479e9c1620f341b494978cd6eb`. This is inventory metadata, not a restorable Supabase-managed Auth/Storage cluster.
- Live hosted canonical 0046 catalog: 4,621, MD5 `e312b40ad91150ce937f4aa00db587f3`. Disposable PG17 import: 4,621 same object keys; 4,506 byte-identical source definitions; 112 RLS raw roles differ only in internal Postgres role OIDs (all 126 policy definitions exactly match after role-name normalization); three storage-path CHECK definitions differ only by one mathematically redundant parenthesis pair, verified byte-by-byte against source; no other drift. Local raw MD5 differs, and is never called identical.

### Supabase ledger read-only observation

Connected `istjjkdcvsvilrycqecd` Fresh Install PostgreSQL 17.6 still has `supabase_migrations.schema_migrations` **zero** rows. Observed columns, in order: `version text NOT NULL`, `statements text[]`, `name text`, `created_by text`, `idempotency_key text UNIQUE`, `rollback text[]`. `version` is primary key; table is owned by postgres.

F6-U03x already requires an independently authorized identity:
`{contract:'shoporation.f6-u03x.reviewed-0046-baseline-identity.v1',projectRef:'istjjkdcvsvilrycqecd',version:<approved 14-digit version>,name:'shoperation_managed_0046_current_state',snapshotSha256:<approved 64-char hash>}`. **Version not selected or approved here.** Current CI source integration includes 31 forward Office SQL sources and requires exactly one approved ledger row before their execution.

### Release boundary / required next controlled action

1. Review an executable schema baseline representation derived from the *actual* encrypted archive, not from an untrusted or regenerated guessed schema. Confirm durable owner-key custody of this **exact new ciphertext**, offline recoverability, the three storage constraints and all RLS grants. Restore private-provider interfaces/recovery independently; the proof deliberately excludes full managed Auth, Storage service state, PITR, role catalog and provider event-trigger restoration.
2. Choose the unique 14-digit migration version and bind it to the verified schema-only SHA and the reviewed baseline artifact. Confirm existing migration table still empty and 0046 catalog fingerprint unchanged immediately before adoption.
3. Explicitly obtain owner approval for the **one** current-state migration ledger adoption using a separately isolated Supabase CLI workspace / safe transaction, never `db push` from this repository, never fabricate 47 old migration records. Treat that live ledger write as a distinct authorized operation, not part of this read-only PR.
4. Only after independently verified one-row adoption, separately authorize 31 forward Office SQL with original source identity and managed Auth/PostgREST signed-JWT Alap/Pro tenant-positive and tenant-denial proofs.

**Proven now:** `SCHEMA_ONLY_ENCRYPTED_CAPTURE_AND_NATIVE_PG17_SEMANTIC_RESTORE_PASS`. **Not proven:** `OWNER_LOCAL_DECRYPT_OF_THIS_ARTIFACT`, `HOSTED_BASELINE_LEDGER_ADOPTED`, `PROVIDER_FULL_DISASTER_RECOVERY`, `MANAGED_SIGNED_JWT_AUTHORIZATION`, `OFFICE_HOSTED_MIGRATIONS`. No hosted mutation authorized or executed. Generic CI plan-before-code failure arises from inherited CLOSED U03x active plan, which must be superseded by an independently governed development transaction before this PR can be merged; do NOT amend the closed old plan retrospectively.
