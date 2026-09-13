# Storefront Wave 61 — Performance Lab Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 61 is the repository-proven direct successor to Wave 60 Trail & Expedition. This is not a newly invented template, checkpoint or scope.

Original scale-out evidence:

- PR #145 — Trail & Expedition (`sport.trail-expedition`);
- PR #146 — Performance Lab (`sport.performance-lab`), stacked directly on Trail & Expedition.

Historical re-acceptance evidence:

- Wave 41 / PR #217 — Trail & Expedition Re-acceptance & Builder Hardening;
- Wave 42 / PR #220 — Performance Lab Re-acceptance & Builder Hardening, stacked directly on Wave 41.

Current stacked evidence:

- Wave 60 acceptance names `sport.performance-lab` as the direct `next` template;
- no repository evidence establishes an intervening Storefront release checkpoint, infrastructure wave, shared runtime hardening checkpoint or Builder checkpoint between Trail & Expedition and Performance Lab.

Canonical current sequence:

`Wave 60 Trail & Expedition → Wave 61 Performance Lab`

## Exact stack boundary

- predecessor branch: `feature/storefront-trail-expedition-wave60`;
- exact predecessor SHA: `1ac7550171d2d5f3f1905f210f65bb5e0ccc3f79`;
- Wave 61 branch: `feature/storefront-performance-lab-wave61`;
- required Draft PR base: `feature/storefront-trail-expedition-wave60`;
- branch is intentionally not based on `main`;
- no rebase from parallel roadmap `main` is authorized;
- no merge to `main` or production deployment is authorized;
- Wave 62 is outside this wave.

## Canonical template identity

- template: **Performance Lab**;
- canonical key: `sport.performance-lab`;
- version: `1`;
- category: Sport & Outdoor;
- portfolio role: specialist goal/spec/compare performance commerce;
- original counterpart: PR #146;
- historical re-acceptance counterpart: Wave 42 / PR #220;
- demo namespace: `sport-performance-lab`;
- minimum plan: `alap`;
- Page Schema presets: 14;
- shared engine contract: `E1 + E2 + E7 + E10 + E13`;
- primary entry question: `Mi a célod?`.

Accepted Home order:

`Performance Lab Hero → Goal Console → Metric Snapshot → Gear Finder → Compare Spotlight → Lab Tested → Expert Review → Research Notes → Footer`

Performance Lab remains visually and structurally distinct from broad Sport Hub retail and route-first cinematic Trail & Expedition.

## Historical Wave 42 hardening

Wave 42 proved and corrected only current-contract drift in the inherited Performance Lab package:

1. Metric Snapshot moved from obsolete `performance.*` authority to the shared metric read-model;
2. comparison bindings moved away from obsolete `compare.*` template-local authority to shared compare bindings;
3. PDP compare controls moved onto shared content/commerce bindings;
4. Catalog collection heading received the unique `performance-catalog-collection-header` node ID;
5. Content uses current-compatible shared `story.body` with `content.researchBody.blocks` / `content.researchBody.relations`.

No shared runtime allowlist, component registry or binding namespace was widened.

## Byte identity / drift hypothesis

The accepted Wave 42 final Performance Lab blob and the current Wave 60 parent resolve to the same Git blob SHA:

`b779f8310730a45e4d48806e7e0350d735830522`

Therefore historical Wave 42 hardening is already inherited byte-for-byte. Wave 61 does not modify `src/lib/builder/templates/performance-lab.ts` before the first exact-head gate. Any implementation change requires a proven current-baseline failure.

## Current-baseline acceptance contract

Wave 61 must prove:

- repository-derived direct succession from current Wave 60;
- `sport.performance-lab` version `1` identity and specialist goal/spec/compare portfolio role;
- exact locked Home order;
- visual and structural distinctness;
- 14 `alap`-compatible Page Schema presets;
- Desktop / Tablet / Mobile support;
- stable page-local unique node IDs;
- current shared component registry compatibility;
- current shared binding namespace compatibility;
- inherited shared Metric Snapshot binding;
- inherited shared compare bindings;
- inherited PDP compare bindings;
- unique `performance-catalog-collection-header`;
- Content `story.body` with `content.researchBody.*`;
- no obsolete `performance.*` or `compare.*` template-local binding authority;
- draft-only installation;
- namespaced demo lifecycle `sport-performance-lab`;
- shared `Template → Page Presets → Section Presets → Components` engine authority;
- E2 catalog/search/channel/product eligibility authority;
- E7 source-supplied structured spec/measurement/compare authority;
- E10 editorial context authority;
- shared product, pricing, inventory, variant, review, checkout and payment authority remains intact;
- E13 provider-neutral checkout;
- no fabricated lab result, performance gain, fitness suitability, endorsement or ranking authority;
- no SQL/customer-baseline change;
- no Supabase mutation;
- no payment/K&H/vPOS modification;
- no Water-K tenant mutation;
- no `main` merge;
- no production deployment;
- no Wave 62 implementation.

## First batch

Wave 61 first batch contains exactly three new files:

- this reconstruction/evidence document;
- `src/lib/builder/templates/performance-lab-wave61-acceptance.ts`;
- `tests/storefront-performance-lab-wave61-reacceptance.test.ts`.

The inherited canonical `src/lib/builder/templates/performance-lab.ts` remains unchanged.

## Initial external baseline — read only

At Wave 61 start:

- GitHub `main`: `e2f472f50657a320708a605402fc70fe5b3db1d5`;
- Wave 60 predecessor HEAD: `1ac7550171d2d5f3f1905f210f65bb5e0ccc3f79`;
- Wave 60 Draft PR #265: open, Draft, unmerged and mergeable;
- Wave 60 CI run `34594970311` / #2817: SUCCESS;
- production Vercel: `dpl_En6RqT3yoFei3Av6ixZC6DE6AU9m`, READY, target `production`, exact SHA `e2f472f50657a320708a605402fc70fe5b3db1d5`;
- Wave 60 preview: `dpl_H3TX2akmEvUMgJpvwYR9VRrqGWtX`, READY, target `null`, exact SHA `1ac7550171d2d5f3f1905f210f65bb5e0ccc3f79`;
- `waterk-platform`: `ACTIVE_HEALTHY`;
- `waterk-staging`: `ACTIVE_HEALTHY`;
- Shoperation Fresh Install: `INACTIVE`.

The deployment-specific production URL is currently Vercel-access gated from the connected verification surface; this start snapshot therefore does not relabel the historical Wave 60 HTTP 200 application-health proof.

Water-K read-only invariants:

- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products `1`;
- variants `3`;
- orders `8`;
- storefront pages `0`;
- storefront page revisions `0`.

Wave 60 stacked customer baseline:

- status `ready`;
- default plan `alap`;
- `freshInstallProofRequired=false`;
- ordered baseline `0001–0017`;
- proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`;
- manifest blob SHA `60b6705ec860849c563f6832460e3c7996f4e433`.

Parallel roadmap movement is external read-only state and must not be imported into this stacked Storefront branch.

## Boundary

Wave 61 remains a stacked Draft PR on Wave 60. It does not authorize a `main` merge, production deployment, Supabase mutation, Fresh Install lifecycle change, Water-K tenant change, K&H/vPOS/payment change, shared runtime/registry/binding widening, or Wave 62 implementation.