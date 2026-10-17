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
