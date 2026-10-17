# Shoperation Core #1186 / #1228 — F6-U03w 0046 original execution and managed baseline adoption handoff

Date 2026-10-17. Parent PR #1407 exact head 8e5d6c08921d2c52e4cfa20fa83764854d2a9418. DRAFT only.

## Original GitHub execution proof recovered

Actual original artifact from CI run 37919705159, attempt 2, job 113806799257, artifact 11613699688 was downloaded and inspected. ZIP SHA256 b7d97cafb6af3a315ca7dc21cd48bf1f07ca9e131f192e12d73383bc4864d170, original proof.json SHA256 a5411b2dd5e61db3c79e2f604386b4fca60e6075edbe936ae107278fc5f7df45. The receipt lists source commit 03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4, contract SHA256 a04b0990e7cf7a0a21591b9fd81fa44d5010ca8818b7edb7f00397c6b84807bb, 47 original customer-baseline 0001–0046 SQL paths (including both 0026) and five PASS claims: target preflight, ordered migrations, Auth bootstrap, neutral seed, target postflight.

This is strong evidence that 0046 original SQL executed in that workflow. The artifact labels its environment fresh-install-disposable but does **not** record the masked DB URL or project ref. It cannot independently prove that historic job's target was the specific CURRENT Supabase project istjjkdcvsvilrycqecd.

## Target presently observed

Current Fresh Install, connected project istjjkdcvsvilrycqecd, PostgreSQL 17.6, 175 public/two private application tables, zero Auth users, empty managed migration ledger, modern Office 0048 absent. Full catalogue read-only check: 4621 definitions MD5 e312b40ad91150ce937f4aa00db587f3. This proves known 0046 target catalogue parity, NOT 47 tracked remote SQL migration applications.

## Future owner-authorized route — ONE new, separately reviewed baseline

1. Confirm encrypted backup owner keeps the matching decryption private key securely outside ChatGPT, can perform recovery, and separately assess full Auth/Storage/PITR recovery. Verify archived GitHub secret-to-target identity where possible. Reconfirm project and catalogue immediately before any adoption.
2. In an **isolated temporary migration workspace**, generate a SCHEMA-ONLY snapshot of CURRENT application public/private schema from that managed Fresh Install; use Supabase db dump rather than interactive db pull, which can prompt to repair remote migration history. Keep the raw dump restricted and review RLS, ACLs, extension ownership and provider-neutrality. No database URL, raw schema, or credential in PR artifacts.
3. Create ONE new, separately versioned current-state baseline (not 47 false historic migration stamps). Test reproduction against a separate disposable PostgreSQL17 instance before proposed adoption. NEVER run original customer-baseline 0001–0046 SQL on this occupied target.
4. If owner signs an exact target/catalog/backup-approved release, adopt the new baseline version into remote migration tracking. Supabase migration repair --status applied **writes** remote tracking and is NOT allowed by this PR. This is separately authorized work, not evidence that all historic individual scripts were tracked.
5. Independently verify migration list and Supabase db push --dry-run from ONLY that isolated workspace; abort if any of the hundreds of historical developer-era supabase/migrations scripts appears. Stage only exact original canonical 31 subsequent Office forward scripts in proper order and rehearse again in native PG17; hosted apply, JWT/PostgREST Alap/Pro authorization and rollback are separate approvals.

## Actual code delivered

Source scripts/shoperation-f6-u03w-baseline-handoff.mjs and tests enforce exact ORIGINAL proof archive hash and source lineage, cannot promote present catalog equality to historic project binding, and emit a **non-executable** human review handoff with releaseAuthorized=false. Workflow f6-u03w-baseline-handoff.yml fetches original artifact using Github Actions built-in token, hashes ZIP and raw JSON, verifies 47 exact SQL filenames, emits ONLY nonsecret handoff.json and operator-review.md. It never has a DB secret, and neither SQL nor migration-repair is executed. Next accountable milestone is owner approval and schema-only snapshot in isolated workspace, not a new generic proof-only module.

Documentation: https://supabase.com/docs/reference/cli/supabase-migration-repair and https://supabase.com/docs/reference/cli/supabase-db-pull. No staging activation, no paid project, no merge; #1186 and #1228 open, Core before Builder and Templates.
