# Storefront Wave 48 Release Checkpoint — current-baseline reconciliation

Date: 2026-09-11

## Canonical historical evidence

Repository history proves that the direct successor of historical Wave 29 / PR #152 was **not** a new template wave. PR #152 stopped template scale-out and required a controlled release checkpoint; PRs #153–#155 performed the prerequisite reconciliation, storefront integration and release checkpoint. Only after that checkpoint established a new production baseline did historical Wave 30 / PR #175 begin.

Therefore the current-baseline successor of Wave 48 is this release/integration checkpoint, **not** an invented Wave 49 template.

## Reconciliation chain

Initial checkpoint inputs:

- Block 19 `main` at checkpoint start: `f06ac77d64053cfe6739fcb1f773eaa5785f1eef`;
- Wave 48 final head: `fb63722ceb012a8f7a5b8ae103f6d92cc11b4f4d`;
- dedicated RC branch: `release/storefront-wave48-checkpoint`;
- storefront integration PR: #236;
- controlled Draft release PR: #237.

While the checkpoint remained open, Roadmap Block 20 was completed and released independently. The production baseline therefore advanced to:

- current `main`: `6a313899e5151a6faa0ebae2fd4e096c49ec3e62`;
- release: Roadmap Block 20 — Platform Ecosystem & Enterprise Extensibility;
- production Vercel deployment: `dpl_BaLxvqiFohheGT7tsMsEar3HKpBu`, READY;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `6a313899e515`.

PR #241 (`RC sync – reconcile Storefront Wave 48 checkpoint with Block 20 main`) merged the exact current `main` **only into the RC branch**, producing reconciled RC head `936c54f7682dbe1cde795f9e4d7f731a54129bfb`. This did not merge PR #237 into `main` and did not deploy the Storefront checkpoint to production.

The storefront stack remains represented by the existing Wave 30–48 changes; the stacked template history was not rewritten.

## Customer baseline and Fresh Install proof — resolved

The earlier checkpoint state inherited a `snapshot-reviewed` customer baseline and therefore correctly failed closed while a new genuine Fresh Install proof was missing.

That blocker was resolved as part of the completed Block 20 release. Current production `main` now carries the proof-bound customer baseline:

- ordered migrations: `0001–0017`;
- manifest status: `ready`;
- `freshInstallProofRequired=false`;
- `proofContractSha256=c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`;
- genuine empty-target proof: CI #2671.

The Block 20 proof executed the reviewed Fresh Install contract against a genuinely empty disposable target: target preflight, atomic ordered baseline apply, Auth bootstrap, neutral seed and target postflight all passed. Production was untouched by the proof job.

After PR #241, the RC branch inherits this manifest byte-for-byte. PR #237 changes no `supabase/customer-baseline/**` file relative to current `main`, so the Storefront checkpoint does not alter the proof contract. A second identical Fresh Install run would add no evidence and is not required; the normal PR Fresh Install job may remain skipped because there is no baseline diff.

Operational Supabase state after the completed proof rotation is restored normally:

- `waterk-platform`: active/healthy;
- `waterk-staging`: active/healthy;
- `Shoperation Fresh Install` (`istjjkdcvsvilrycqecd`): inactive.

No paid Supabase development branch is required for this checkpoint.

## Reconciled exact-head release evidence

On reconciled RC head `936c54f7682dbe1cde795f9e4d7f731a54129bfb`, GitHub CI #2679 / run `34572643967` completed **SUCCESS**.

Passed gates:

- Security audit;
- Customer database baseline guard;
- full Quality tests;
- TypeScript;
- production build;
- Release Manifest generation/upload.

Artifacts:

- Quality artifact `10188368923`, SHA-256 `e5f28429561bf30fe0caa4004bf4d21009af3efbf4b2f8f89c55aaa6d281112a`;
- Release Manifest artifact `10188410609`, SHA-256 `e1c3dc3cabe271706f26d9db7912ffd253761ca0bfdf30b415f035591e065ebd`.

The Fresh Install job is skipped on this PR because the checkpoint introduces no customer-baseline diff; release proof authority is the already completed exact `0001–0017` proof bound into current `main`.

## Reconciled preview evidence

Exact-head Vercel preview for `936c54f7682dbe1cde795f9e4d7f731a54129bfb`:

- deployment: `dpl_6yHTJupeBs7dMXvW9JspQo9sSUpi`;
- state: READY;
- target: `null`;
- branch: `release/storefront-wave48-checkpoint`.

Direct preview `/api/health` remains behind Vercel Deployment Protection and returns an SSO HTTP 302 before the application endpoint. This is not recorded as a false HTTP 200 smoke PASS. Production health remains independently proven on the Block 20 production deployment.

## Current release gate

PR #237 is open, Draft and mergeable against current `main`. The code/database proof gates are reconciled and green. Any later movement of `main` before release authorization requires another exact-main reconciliation.

The remaining protected-preview health limitation is an evidence-access limitation caused by Vercel Deployment Protection; no security control is disabled to manufacture a smoke result.

## Production boundary

This checkpoint does **not** authorize or perform:

- merge of PR #237 into `main`;
- Storefront production deployment or promotion;
- production or staging Supabase mutation;
- new production SQL migration;
- Water-K status or plan change;
- K&H/vPOS/payment changes;
- shared Storefront/commerce authority loosening;
- Block 21 Page Schema / Templates implementation;
- Block 22 Visual Builder implementation.

A production rollout remains a separate explicit controlled-release GO. Until then PR #237 remains Draft and template scale-out stays stopped.
