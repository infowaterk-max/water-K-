# Storefront Wave 60 — Trail & Expedition Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 60 is not a newly invented template or checkpoint. Repository and PR history prove Trail & Expedition as the direct canonical successor to Sport Hub in both accepted Storefront sequences.

Original scale-out chain:

- Wave 21 / PR #144 — Sport Hub (`sport.sport-hub`);
- Wave 22 / PR #145 — Trail & Expedition (`sport.trail-expedition`), stacked directly on Sport Hub;
- Wave 23 / PR #146 — Performance Lab (`sport.performance-lab`), stacked directly on Trail & Expedition.

Historical re-acceptance chain:

- Wave 40 / PR #215 — Sport Hub Re-acceptance & Builder Hardening;
- Wave 41 / PR #217 — Trail & Expedition Re-acceptance & Builder Hardening, stacked directly on Wave 40 Sport Hub;
- Wave 42 / PR #220 — Performance Lab Re-acceptance & Builder Hardening, stacked directly on Wave 41 Trail & Expedition.

The current Wave 59 acceptance contract independently names `sport.trail-expedition` as its `next` template. No Storefront release checkpoint, infrastructure wave, common runtime hardening checkpoint or Builder checkpoint intervenes in either accepted stacked sequence between Sport Hub and Trail & Expedition.

Canonical current sequence:

`Wave 59 Sport Hub → Wave 60 Trail & Expedition → Performance Lab`

## Exact stack boundary

- predecessor branch: `feature/storefront-sport-hub-wave59`;
- exact predecessor SHA: `26381f81473da7f6cc329bc800dc8d021d6ccc5d`;
- Wave 60 branch: `feature/storefront-trail-expedition-wave60`;
- required Draft PR base: `feature/storefront-sport-hub-wave59`;
- branch is intentionally not based on `main`;
- no rebase from parallel roadmap `main` is authorized;
- no merge to `main` or production deployment is authorized;
- Wave 61 is outside this wave.

## Canonical template identity

- template: **Trail & Expedition**;
- canonical key: `sport.trail-expedition`;
- version: `1`;
- category: Sport & Outdoor;
- portfolio role: route/adventure-first trail, trekking and camping commerce;
- historical counterpart: Wave 41 / PR #217;
- original counterpart: Wave 22 / PR #145;
- demo namespace: `sport-trail-expedition`;
- minimum plan: `alap`;
- Page Schema presets: 14;
- shared engine contract: `E1 + E2 + E7 + E10 + E13`.

Primary route-first shopping question:

`Hová indulsz?`

Accepted adventure routes:

- Egynapos túra;
- Hétvégi trekking;
- Kemping;
- Trail run;
- Téli kaland;
- Családi kiruccanás.

Selector contract:

- geometry: `diamond-slant`;
- default state: `muted-desaturated`;
- active state: `color-detail-cta`;
- desktop interaction: `hover-focus`;
- mobile interaction: `tap-carousel`.

Accepted Home order:

`Trail & Expedition Hero → Adventure Selector → Gear Checklist → Adventure Kits → Route / Map Feature → Trail Essentials → Field Notes → Outdoor Guides → Footer`

Trail & Expedition remains deliberately distinct from Sport Hub mainstream multisport retail and Performance Lab specialist goal/spec/data commerce.

## Historical Wave 41 hardening

Historical Wave 41 exposed two real current-contract compatibility defects in the inherited original Trail template and corrected only those defects:

1. duplicate Catalog node identity was removed by using `trail-catalog-collection-header` for the collection heading while retaining `trail-catalog-header` for the system header;
2. inherited Content `story.index` was replaced with current-content-compatible shared `story.body`, with the stable `trail-content-guide-body` node and existing shared `content.guideBody.blocks` / `content.guideBody.relations` bindings.

No shared runtime allowlist, component registry or binding namespace was widened.

Historical Wave 41 accepted final HEAD: `5b0e4c864ff7c6364db1fb65ab681ca9019670bf`.

## Byte identity / drift hypothesis

Before Wave 60 implementation, `src/lib/builder/templates/trail-expedition.ts` was read at:

- historical accepted Wave 41 final HEAD `5b0e4c864ff7c6364db1fb65ab681ca9019670bf`;
- current Wave 59 final HEAD `26381f81473da7f6cc329bc800dc8d021d6ccc5d`.

Both refs resolve to the exact same Git blob SHA:

`e42b78a63fb19e485427538f95df35c805f7f3a4`

This is byte-level evidence that historical Wave 41 hardening is already inherited on the current stacked baseline. Wave 60 therefore does not modify `trail-expedition.ts` before the first exact-head gate. Any implementation change requires a proven current-baseline failure.

## Current-baseline acceptance contract

Wave 60 must prove:

- canonical historical succession and no intervening Storefront checkpoint;
- `sport.trail-expedition` version `1` identity and route/adventure-first portfolio role;
- exact locked Home section order;
- route selector question, six routes and responsive Diamond/Slant interaction contract;
- visual and structural distinctness from Sport Hub and Performance Lab;
- all 14 Alap-compatible Page Schema presets;
- Desktop / Tablet / Mobile support;
- stable, page-local unique node IDs;
- inherited `trail-catalog-collection-header` node de-duplication;
- inherited shared Content `story.body` compatibility and `content.guideBody.*` bindings;
- current shared component registry compatibility;
- current shared binding namespace compatibility;
- no template-local `trail.*`, `routeSafety.*`, `weather.*`, `difficulty.*` or `fitness.*` truth namespaces;
- `Template → Page Presets → Section Presets → Components` hierarchy;
- merchant-editable design tokens;
- draft-only installation and namespaced demo lifecycle `sport-trail-expedition`;
- E2 catalog/search/channel/product eligibility authority;
- E7 structured outdoor/product fact authority only when authoritative data supplies it;
- E10 checklist, Field Note, Guide and route-editorial presentation;
- E13 provider-neutral checkout and final commerce authority;
- shared product, pricing, inventory, variant, review, checkout and payment authority remains intact;
- Route / Map remains editorial context only, not live GPS/navigation/weather/safety/difficulty authority;
- no fabricated route safety, weather suitability, difficulty, fitness suitability, survival or performance claim;
- no template-local Guided Finder, layout, commerce or checkout engine;
- no shared allowlist, component registry or binding namespace widening merely to make the gate pass;
- no SQL or customer-baseline change;
- no Supabase mutation;
- no payment/K&H/vPOS modification;
- no Water-K tenant mutation;
- no `main` merge;
- no production deployment;
- no Wave 61 implementation.

## First batch

Wave 60 first batch contains exactly three new files:

- this reconstruction/evidence document;
- `src/lib/builder/templates/trail-expedition-wave60-acceptance.ts`;
- `tests/storefront-trail-expedition-wave60-reacceptance.test.ts`.

The inherited canonical `src/lib/builder/templates/trail-expedition.ts` remains unchanged before the first exact-head acceptance gate.

## Initial external baseline — read only

At Wave 60 start:

- GitHub `main`: `e2f472f50657a320708a605402fc70fe5b3db1d5` — Roadmap Block 24 / PR #260;
- Wave 59 predecessor HEAD: `26381f81473da7f6cc329bc800dc8d021d6ccc5d`;
- Wave 59 Draft PR #263: open, Draft, unmerged, mergeable;
- Wave 59 CI run `34593952927` / #2813: SUCCESS on exact predecessor SHA;
- Wave 59 quality baseline: 277 test files, 556/556 suites, 2139/2139 tests, Wave 59 10/10 and inherited Wave 40 10/10;
- production Vercel: `dpl_En6RqT3yoFei3Av6ixZC6DE6AU9m`, READY, target `production`, exact SHA `e2f472f50657a320708a605402fc70fe5b3db1d5`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `e2f472f50657`;
- Wave 59 final preview: `dpl_2cL3SK6K28K7hWjxEYKZxgw7QyFm`, READY, target `null`, exact SHA `26381f81473da7f6cc329bc800dc8d021d6ccc5d`;
- `waterk-platform`: `ACTIVE_HEALTHY`;
- `waterk-staging`: `ACTIVE_HEALTHY`;
- Shoperation Fresh Install: `INACTIVE`.

Parallel non-Storefront preview work exists on separate branches, but it has not changed the Storefront stacked truth. Wave 60 treats all parallel roadmap/product movement as external read-only state and does not import it.

Water-K read-only start invariants:

- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products `1`;
- variants `3`;
- orders `8`;
- storefront pages `0`;
- storefront page revisions `0`.

Wave 59 stacked customer baseline:

- status `ready`;
- default plan `alap`;
- `freshInstallProofRequired=false`;
- ordered baseline `0001–0017`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`;
- manifest blob SHA `60b6705ec860849c563f6832460e3c7996f4e433`.

The independently advanced Block 24 `main` has a newer customer baseline history. It is intentionally not pulled into this stacked Storefront branch.

## Boundary

Wave 60 remains a stacked Draft PR on Wave 59. It does not authorize a `main` merge, production deployment, staging/production Supabase mutation, Fresh Install lifecycle change, Water-K status/plan change, K&H/vPOS/payment behavior change, auth/RLS/security weakening, shared runtime/registry/binding widening, Visual Builder or AI Builder roadmap expansion, or Wave 61 implementation.
