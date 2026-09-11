# Storefront Scale-out Wave 42 — Performance Lab Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 42 is the re-acceptance of the repository's original **Wave 23 — Performance Lab**. This is repository-derived, not a newly invented template or ordering:

- original PR #145: Trail & Expedition (historical Wave 22);
- original PR #146: Performance Lab (historical Wave 23), stacked directly on Trail & Expedition;
- accepted current scale-out sequence from Wave 41: Sport Hub → Trail & Expedition → Performance Lab;
- canonical template key: `sport.performance-lab`;
- canonical positioning: specialist goal/spec/compare performance commerce;
- primary entry question: `Mi a célod?`;
- canonical layers: Goal Console, Metric Snapshot, Gear Finder, Compare Spotlight, Lab Tested, Expert Review, Research Notes;
- shared engine contract: `E1 + E2 + E7 + E10 + E13`;
- 14 Page Schema presets, `alap` compatible;
- demo namespace: `sport-performance-lab`.

The template remains visually and structurally distinct from the mainstream Sport Hub and route-first cinematic Trail & Expedition templates.

## Baseline checked before Wave 42 work

The Wave 42 branch was created directly from the closed Wave 41 final head:

- base branch: `feature/storefront-trail-expedition-wave41`;
- exact base SHA: `5b0e4c864ff7c6364db1fb65ab681ca9019670bf`;
- Wave 41 Draft PR #217 was open, draft, unmerged and mergeable;
- Wave 41 final CI #2448 / run `34524831005` was successful;
- Wave 41 preview was READY with `target=null` and exact Wave 41 SHA.

At the initial production read-only check:

- `main`: `9d0393e7e879afbb63208cc6bbfc83a6436d630e`;
- `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `9d0393e7e879`;
- production Supabase `waterk-platform`: `ACTIVE_HEALTHY`;
- staging Supabase `waterk-staging`: `ACTIVE_HEALTHY`;
- Water-K instance: slug `water-k`, status `pilot`, plan `pro`;
- customer baseline manifest: `ready`, default plan `alap`, `freshInstallProofRequired=false`;
- referenced genuine Fresh Install proof run `34346892406`: success.

No production, staging or tenant mutation was performed.

## Contract-first first gate

The first Wave 42 commit intentionally added only the current-baseline acceptance contract and targeted tests, before modifying the inherited Performance Lab template:

- first-gate SHA: `ccd6072771a6d0a889f218f08f75a5f241883b2b`;
- CI run: `34526279438` / CI #2466;
- result: expected failure at Quality tests;
- security audit: PASS;
- customer database baseline guard: PASS;
- Fresh Install proof: skipped because the baseline manifest does not require a fresh migration proof.

The failing quality artifact was downloaded and inspected, rather than inferred from CI status alone:

- quality artifact id: `10171686260`;
- digest: `sha256:62cc34b3a31da4bd86aa67726498cf8b67876b4809531bb5d2f47d2a040d0266`;
- ZIP digest was independently recalculated and matched the GitHub digest;
- 462 suites / 1672 tests total;
- 460 suites / 1668 tests passed;
- four Wave 42 assertions exposed the inherited current-contract drift.

The artifact-proven mismatches were:

1. obsolete `performance.*` binding namespace for Metric Snapshot;
2. obsolete `compare.*` binding namespace for comparison read-models and PDP compare controls;
3. duplicate catalog node identity (`performance-catalog-header`);
4. `story.index` on the `content` Page Schema preset, where the current shared story contract requires an allowed content surface.

## Current-contract hardening

Only those actual inherited mismatches were corrected. Shared runtime, shared component registry, page allowlists and global binding namespace rules were **not** widened.

Corrections:

- Metric Snapshot → shared `commerce.metricSnapshot` read-model, still presentation-only over E7-supplied measurements;
- comparison products/rows/groups → shared `commerce.*` comparison read-models;
- PDP compare controls → `content.productCompare.label` plus shared `commerce.compareHref` / `commerce.compareCount`;
- duplicate catalog collection-header node ID → stable unique `performance-catalog-collection-header`;
- Content research surface → shared `story.body` with `content.researchBody.blocks` / `content.researchBody.relations`;
- Blog Index retains `story.index`, where that shared component remains allowed.

No template-local price, stock, inventory, product eligibility, checkout, payment, fitness, performance-result, ranking or endorsement authority was introduced.

## Accepted implementation evidence

Implementation head:

- SHA: `8a4dc670d10a0a7a2216f87db7bb176876a4570b`;
- CI run: `34527116050` / CI #2472;
- result: SUCCESS.

CI gates:

- customer database baseline guard: PASS;
- Quality tests: PASS;
- TypeScript: PASS;
- production build: PASS;
- production dependency security audit: PASS;
- Fresh Install proof: skipped as expected (`freshInstallProofRequired=false`).

Downloaded and inspected quality artifact:

- artifact id: `10172003515`;
- digest: `sha256:4a37cda637a64f78b92c25af6e87d0153ae8c048740f6e2bce14f15d343cfa9a`;
- independently recalculated ZIP digest matched;
- 462 / 462 suites PASS;
- 1672 / 1672 tests PASS;
- targeted Wave 42 acceptance: 11 / 11 PASS.

Downloaded and inspected release artifact:

- artifact id: `10172049949`;
- digest: `sha256:8fe5208853d88255329ad8af13c88c50620f3bfd41ec9f100b40e5ef281f125c`;
- independently recalculated ZIP digest matched;
- manifest exact SHA: `8a4dc670d10a0a7a2216f87db7bb176876a4570b`;
- release hash: `4b12fb8e9b933e17a2b76200dec688316613f5410a2e8a30db2f382ac6b5b2fe`.

Implementation Vercel preview:

- deployment: `dpl_8t78L7A4T6fVBA5TUPHwKYKA1Axj`;
- URL: `water-k-native-cc6ouve9f-infowaterk-5067.vercel.app`;
- state: READY;
- target: `null`;
- Git SHA: `8a4dc670d10a0a7a2216f87db7bb176876a4570b`.

## Builder and authority invariants

Wave 42 remains Builder-native:

`Template → Page Presets → Section Presets → Components`

The accepted contract keeps:

- stable node IDs;
- stable binding paths;
- shared Desktop / Tablet / Mobile responsive grid;
- 14 Page Schema presets;
- `alap` minimum plan;
- shared E2 discovery authority;
- shared E7 structured product/spec/measurement/compare authority;
- shared E10 editorial context;
- shared E13 provider-neutral cart/checkout authority;
- declarative Goal Console / Gear Finder presentation with no template-local stateful finder authority.

Missing measurements, lab results, suitability, rankings, endorsements or performance gains remain missing; the template must never infer them.

## Non-scope and mutation ledger

This Wave did not introduce:

- Visual Builder drag/drop, live canvas or inline editing;
- shared runtime/registry/allowlist widening;
- SQL or migration files;
- payment-provider changes;
- production deployment by the storefront wave;
- Supabase production/staging mutation;
- Water-K tenant status or plan change;
- merge to `main`;
- Wave 43 implementation.

This evidence document is intentionally committed after the accepted implementation so that a new exact-head CI and preview can validate the documentation final HEAD before Wave 42 closure.
