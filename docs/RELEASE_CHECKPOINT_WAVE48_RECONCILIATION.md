# Storefront Wave 48 Release Checkpoint — current-baseline reconciliation

Date: 2026-09-11

## Canonical historical evidence

The repository history proves that the direct successor of historical Wave 29 / PR #152 was **not** a new template wave.

PR #152 explicitly stopped template scale-out and required a controlled release checkpoint. The immediate historical chain was:

1. PR #153 — `RC preflight – reconcile Block 7 prerequisite`;
2. PR #154 — `RC preflight – integrate storefront through Wave 29`;
3. PR #155 — `Release Checkpoint – Storefront through Wave 29`.

Only after that checkpoint established a new production baseline did historical Wave 30 / PR #175 (`beauty.derma-studio`) begin.

Therefore the current-baseline successor of Wave 48 is this release/integration checkpoint, **not** an invented Wave 49 template.

## Current reconciliation inputs

- production/current `main` at checkpoint start: `f06ac77d64053cfe6739fcb1f773eaa5785f1eef`;
- Wave 48 final head: `fb63722ceb012a8f7a5b8ae103f6d92cc11b4f4d`;
- dedicated RC branch: `release/storefront-wave48-checkpoint`;
- integration preflight PR: #236;
- integration merge head before this evidence commit: `aaeae51f45106f033b1786eab4f914f6021b0ff0`;
- controlled Draft release PR: #237, base `main`, head `release/storefront-wave48-checkpoint`.

The checkpoint branch was created from the exact current `main`, then the complete inherited storefront stack through Wave 48 was integrated into it. The storefront stack was **not** rebased onto `main`, and the stacked Draft PR chain was not rewritten.

## Baseline reconciliation

The two development lines intentionally carried different customer-baseline states before integration:

### Wave 48 inherited storefront baseline

- ordered customer baseline: 0001–0005;
- `status = ready`;
- `freshInstallProofRequired = false`;
- proof contract from the earlier historical checkpoint: `8cb833cfc5063c777c1335e6cc64d5447de3c0a418ac3145fbd54d38a6224e0a`.

### Current `main` baseline

- ordered customer baseline: 0001–0012;
- `status = snapshot-reviewed`;
- `freshInstallProofRequired = true`;
- `proofContractSha256 = null`;
- the manifest explicitly requires a new genuine empty-target Fresh Install proof before returning to `ready`.

The RC integration preserves the **current-main** manifest and ordered migrations through `0012_product_media_management_v1.sql`. No Wave 30–48 storefront change introduces a customer-baseline migration, so no storefront-local migration is invented or added by this checkpoint.

## Fresh Install requirement and allowed disposable-target scope

A genuine Fresh Install proof is required by the current-main manifest and by the historical release-checkpoint contract. The repository workflow `Fresh Install proof` is manual (`workflow_dispatch`) and applies the exact ordered `supabase/customer-baseline/migrations/*.sql`, Auth bootstrap and neutral seed only after the read-only `target-preflight.sql` proves that the disposable target is genuinely empty.

Dedicated disposable project:

- name: `Shoperation Fresh Install`;
- ref: `istjjkdcvsvilrycqecd`;
- state at checkpoint start: `INACTIVE`.

For this checkpoint, the only permitted Supabase mutation outside CI is limited to this **disposable Fresh Install project** and only as necessary to establish a genuinely empty proof target and run the reviewed baseline proof. Production `waterk-platform` and `waterk-staging` remain read-only and must not be mutated.

No production migration is authorized by Fresh Install proof. Proof completion only satisfies an evidence prerequisite.

## Required exact-head release evidence

Before this checkpoint can be considered code/evidence complete:

- PR #237 must remain mergeable against the exact current `main`;
- Security PASS;
- Customer baseline guard PASS;
- full Quality suite PASS;
- TypeScript PASS;
- production build PASS;
- Release Manifest generation/upload PASS;
- genuine empty-target Fresh Install proof PASS for the exact ordered current baseline;
- exact final RC Vercel Preview READY, `target=null`, correct branch and exact Git SHA;
- Quality and Release Manifest artifacts downloaded and independently SHA-256 verified;
- exact release hash recorded;
- production `/api/health` remains healthy;
- Water-K remains `pilot / pro`.

If `main` advances again before checkpoint closure, reconciliation must be repeated against the new exact `main` SHA before any release authorization.

## Production boundary

This checkpoint evidence/implementation phase does **not** authorize or perform:

- merge of PR #237 into `main`;
- Vercel production deploy or promotion;
- production or staging Supabase mutation;
- production SQL migration;
- Water-K status or plan change;
- K&H/vPOS/payment changes;
- shared Storefront/commerce authority loosening;
- Visual Builder implementation or Block 22 work.

A production rollout requires a separate explicit controlled release GO after every gate above is satisfied. Until then PR #237 remains Draft.
