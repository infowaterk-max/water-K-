# Shoperation Core #1186 / #1228 — existing 0046 managed baseline adoption

2026-10-17. Direct stacked parent #1407 head 8e5d6c08921d2c52e4cfa20fa83764854d2a9418. DRAFT only, no merge.

## Previously overlooked historical Fresh Install deployment evidence

GitHub Actions run https://github.com/infowaterk-max/water-K-/actions/runs/37919705159 attempt 2, job 113806799257, source commit 03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4, actually executed all existing ordered customer-baseline SQL through 0046 plus auth-bootstrap and neutral seed with an empty-target preflight. Job outcome SUCCESS, target postflight 175 public tables, 344 functions, 126 RLS policies and no customer rows, proof contract SHA256 a04b0990e7cf7a0a21591b9fd81fa44d5010ca8818b7edb7f00397c6b84807bb and artifact ID 11613699688.

IMPORTANT: the *enclosing workflow* failed because a DIFFERENT build job failed. Do not conflate run and dedicated proof-job status. The workflow connection secret is redacted, so it does not independently attest the original database endpoint is the exact present Fresh Install project.

The currently connected Fresh Install istjjkdcvsvilrycqecd is active PG17.6; 175 public/two private tables, 0 Auth users, 0 migration rows, absent Office 0048. Prior independently observed full 0046 catalogue showed 4621 definitions and MD5 e312b40ad91150ce937f4aa00db587f3. This strongly corroborates the historical SQL baseline execution, but 47 original source migrations did not get official Supabase ledger records. Never invent those records.

## Route out of empty-ledger deadlock: NEW current-state baseline, not historical stamps

Supabase officially supports adopting an existing managed database into versioned migration governance with a schema baseline. Source documentation, reviewed 2026-10-17:
- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/local-development/cli-workflows

IMPORTANT: the repository has 400+ unrelated historical SQL migration files under supabase/migrations and 59 canonical ordered customer-baseline migrations under supabase/customer-baseline/migrations. Never invoke supabase db push from this repository root against the empty-ledger Fresh Install. A safe adoption requires a distinct CLI workspace, independent exact-project verification and explicitly owner-approved changes.

## One-time operator-controlled action chain (NOT performed here)

1. Independently associate the historical CI database URL host with the exact current project without printing credentials. The old GitHub log masks the secret. Record owner acceptance and exact source ref.
2. Confirm off-platform durable custody of the matching encrypted backup private key. Prove which app data can be restored; full Supabase Auth/Storage/PITR recovery is NOT established by the prior native PostgreSQL application dump.
3. Repeat a fresh read-only exact-project catalogue check, RLS/policies/provider hooks and baseline neutral-data assertions; cancel if the 0046 state drifts.
4. From an isolated empty operator-controlled folder, inspect installed CLI help for supabase db dump, db pull and migrations. Capture schema-only public/private using an appropriate current PG17 pg_dump or Supabase db dump; audit Auth/Storage provider custom triggers, policies, grants, defaults and extensions separately.
5. Keep the raw schema dump outside public artifacts; inspect for secrets, review a source digest, replay the captured baseline on an isolated disposable PG17 and compare complete definitions, neutral seed and permission security.
6. ONLY after explicit owner write authorization and verified recovery, run supabase db pull interactively from that empty workspace. Its migration-history prompt may mark a newly generated baseline as applied, and noninteractive runs may auto-accept. Do not run this command in CI or from the Shoperation root. The new baseline proves CURRENT schema state only, not historical 47-step Supabase ledger provenance.
7. Do not run migration repair to mark each of the old 47 customer sources as applied. Only a separately approved NEW current-state baseline may be adopted after review.
8. Retain all 31 source-exact 0047–0058 Office forward migrations in original order. Later separately authorize guarded managed application, proper rollback/recovery, actual signed Supabase Auth and PostgREST Alap/Pro/tenant denials before Digital Office release.

## Implementation contract

scripts/shoperation-f6-u03w-baseline-adoption.mjs anchors the exact GitHub job, artifact and commit, verifies immutable original 78-source/31-forward lineage and detects the hazardous 400+ root migrations. It accepts a current exact-project read-only 0046 observed catalogue only as a review candidate. Even positive evidence reports historic target cryptographic linkage false, 47 historical ledger entries NOT marked, remote baseline NOT captured, host writes false and releaseAuthorized false.

The CI runs source-only positive/negative/fault-injection tests. No hosted write, source rewrite, rollback, project billing change, staging activation or merge is performed. Keep #1186 and #1228 OPEN; Core before Builder/Templates. Future work should be actual baseline enrollment under owner control, not more disjoint catalogue validators.
