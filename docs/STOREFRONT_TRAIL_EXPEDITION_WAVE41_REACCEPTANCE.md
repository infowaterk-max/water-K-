# Storefront Scale-out Wave 41 — Trail & Expedition Re-acceptance & Builder Hardening

## Canonical verdict

Wave 41 re-accepts the repository's original **Wave 22 — Trail & Expedition** package on the current storefront baseline. The identity is reconstructed from the historical stacked sequence, not invented for this wave:

- historical PR #145: **Trail & Expedition (`sport.trail-expedition` v1)** stacked directly on Sport Hub;
- historical PR #146: **Performance Lab (`sport.performance-lab` v1)** stacked directly on Trail & Expedition;
- current Wave 40 acceptance metadata names Trail & Expedition as the canonical next template.

Current sequence:

`Wave 40 Sport Hub → Wave 41 Trail & Expedition → Wave 42 Performance Lab`

Wave 42 is not part of this change.

## Stack boundary

- Repository: `infowaterk-max/water-K-`
- Base branch: `feature/storefront-sport-hub-wave40`
- Exact base SHA: `3f8f57f760d42c4132e86552eeb3cbc5e6510e44`
- Wave 41 branch: `feature/storefront-trail-expedition-wave41`
- Accepted implementation HEAD: `c53cf7cf317590a506912b25bb5965a811a84dc7`

This remains a stacked Draft-PR wave. It does not authorize a `main` merge or production rollout.

## Canonical template contract

- Template key: `sport.trail-expedition`
- Version: `1`
- Category: `sport-outdoor`
- Portfolio role: route/adventure-first trail, trekking and camping commerce
- Minimum plan: `alap`
- Demo namespace: `sport-trail-expedition`
- Page Schema presets: 14
- Required shared engine contract: `E1 + E2 + E7 + E10 + E13`

Trail & Expedition remains deliberately distinct from both neighboring Sport & Outdoor directions:

- Sport Hub: broad mainstream multisport commerce hub;
- Trail & Expedition: route/adventure-first trail, trekking and camping commerce;
- Performance Lab: specialist goal/spec/data/performance commerce.

It must not become a recolored Sport Hub, a dark Performance Lab or a generic hero/cards/grid reskin.

## Experience identity

Primary shopping entry:

**`Hová indulsz?`**

Approved routes:

1. Egynapos túra
2. Hétvégi trekking
3. Kemping
4. Trail run
5. Téli kaland
6. Családi kiruccanás

Diamond / Slant selector metadata remains:

- geometry: `diamond-slant`;
- default: `muted-desaturated`;
- active: `color-detail-cta`;
- desktop: `hover-focus`;
- mobile: `tap-carousel`.

Exact Home order remains:

1. Trail & Expedition Hero
2. Adventure Selector
3. Gear Checklist
4. Adventure Kits
5. Route / Map Feature
6. Trail Essentials
7. Field Notes
8. Outdoor Guides
9. Footer

## Shared-authority boundary

The template remains presentation/composition only:

- E1 owns shared Page Schema/runtime/component/binding behavior;
- E2 owns catalog, search, channel and product eligibility/discovery authority;
- E7 owns only source-supplied structured product/outdoor facts;
- E10 owns editorial/checklist/Field Note/Guide presentation;
- E13 owns provider-neutral cart/checkout and final commerce authority.

The route selector is shared collection-navigation presentation. The Gear Checklist is editorial presentation. The Route / Map Feature is static/editorial context.

The template does not own or infer:

- route safety;
- weather suitability;
- route difficulty;
- fitness suitability;
- survival claims;
- performance claims;
- live GPS/navigation;
- price or stock truth;
- product eligibility;
- checkout/payment authority.

No Trail-specific stateful Guided Finder is introduced. Any future stateful trip planner must compose with the shared Guided Finder architecture rather than becoming a template-local authority engine.

## Current-baseline gate and inherited defects

The first explicit Wave 41 gate ran on HEAD `0e9a768964a1867c1c48ce8438fb743189324bbe`.

- CI: **#2443**
- Actions run: `34523962149`
- Security audit: PASS
- Quality: FAIL
- Quality artifact ID: `10170799023`
- Artifact digest: `sha256:d1d096e152c1e0461215cd2d4c39045f2e2a75db7bf5d9630c2db0c3136b13ec`
- Suites: 458 passed / 2 failed / 460 total
- Tests: 1658 passed / 2 failed / 1660 total

The downloaded artifact exposed two inherited current-contract violations:

1. `NODE_ID_DUPLICATE` on the Catalog page because `header('trail-catalog')` and the collection header both resolved to `trail-catalog-header`.
2. `COMPONENT_PAGE_TYPE_NOT_ALLOWED` on the Content page because inherited `story.index` is no longer allowed on the current shared `content` page contract.

The installation planner also failed closed because of the same capability-gate errors.

## Builder hardening corrections

Only the Trail template was corrected. The shared registry/runtime/allowlist was not widened.

1. Catalog collection header node ID:
   - from `trail-catalog-header`
   - to `trail-catalog-collection-header`
2. Content detail presentation:
   - inherited `story.index` replaced with current-content-allowed shared `story.body`;
   - node ID `trail-content-guide-body`;
   - bindings use existing allowed shared paths `content.guideBody.blocks` and `content.guideBody.relations`.

This follows the current shared Builder contract and keeps stable, explicit node and binding identity without introducing a Trail-specific namespace.

## Accepted implementation evidence

Accepted implementation HEAD:

`c53cf7cf317590a506912b25bb5965a811a84dc7`

CI:

- CI **#2446**
- Actions run `34524486788`
- Security audit: PASS
- Customer database baseline guard: PASS
- Quality tests: PASS
- TypeScript: PASS
- Production build: PASS
- Release manifest generation/upload: PASS
- Fresh Install proof: intentionally skipped because this wave contains no baseline migration

Downloaded quality artifact:

- artifact ID `10170994869`
- digest `sha256:aeb39d8b4b13462cbba4b03bd52ee56161bceeda9589c4b40113d2069d2b7962`
- 460 / 460 suites PASS
- 1660 / 1660 tests PASS
- 0 failed / 0 pending / 0 todo
- Wave 41 acceptance suite: 10 assertions PASS, 0 failed

Downloaded release artifact:

- artifact ID `10171042905`
- digest `sha256:124bab4237c3ed033b86952dd250b7f71cf9989f80a47db8ca3e7a2764e42db5`
- manifest version `v24`
- SHA `c53cf7cf317590a506912b25bb5965a811a84dc7`
- ref `feature/storefront-trail-expedition-wave41`
- environment `ci`
- release hash `5d5722626ab61bbd91709926f401c0c6214aa9d7947c21d3114154379c1d2ab3`

## Implementation preview evidence

Vercel preview for the accepted implementation HEAD:

- deployment ID `dpl_74pQYHWJV4XBADiQvhtkNsTKxAFZ`
- URL `water-k-native-18l8j99i0-infowaterk-5067.vercel.app`
- state `READY`
- target `null`
- Git ref `feature/storefront-trail-expedition-wave41`
- Git SHA `c53cf7cf317590a506912b25bb5965a811a84dc7`

This is a non-production preview only.

## Exact implementation diff vs Wave 40

At accepted implementation HEAD, compared with the exact Wave 40 base:

- status: ahead
- 4 commits ahead
- 0 behind
- 3 changed files
- `src/lib/builder/templates/trail-expedition-wave41-acceptance.ts`: added
- `tests/storefront-trail-expedition-wave41-reacceptance.test.ts`: added
- `src/lib/builder/templates/trail-expedition.ts`: 2 additions / 2 deletions

There is no SQL/migration change and no shared storefront runtime/engine/registry/allowlist change.

## Explicit non-scope / rollout boundary

Wave 41 does not authorize or introduce:

- `main` merge;
- Vercel production deployment;
- Supabase production/staging mutation;
- SQL migration;
- Water-K tenant status change;
- payment/K&H/vPOS change;
- template-local stateful Guided Finder;
- live routing/GPS;
- live weather/safety/difficulty/fitness authority;
- Visual Builder drag/drop UI;
- live canvas;
- inline editing;
- Wave 42 implementation.

The final closure gate must be the exact documentation HEAD with green CI, inspected quality/release artifacts, a READY non-production preview, and an open/mergeable Draft PR stacked on `feature/storefront-sport-hub-wave40`.