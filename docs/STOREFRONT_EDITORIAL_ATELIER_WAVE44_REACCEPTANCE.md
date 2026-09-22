# Storefront Scale-out Wave 44 — Editorial Atelier / Atelier Nova Re-acceptance & Builder Hardening

## Canonical scope reconstruction

Wave 44 is repository-derived from the original stacked storefront sequence, not newly invented.

Historical evidence establishes the direct sequence:

1. PR #146 — Wave 23 Performance Lab
2. PR #147 — Wave 24 Golden #1 Monarche (`fashion.monarche` v1)
3. PR #148 — Wave 25 Editorial Atelier / Atelier Nova (`fashion.editorial-atelier` v1)
4. PR #149 — Wave 26 Street Drop

PR #148 was stacked directly on `feature/storefront-monarche-wave24` at Monarche's exact final head `08e2567e6d9d25cd758d336e38eef107b7dcdb00`. PR #149 then used `feature/storefront-editorial-atelier-wave25` as its base. Therefore the canonical Wave 44 scope is the original Wave 25 Editorial Atelier / Atelier Nova package.

Historical Wave 25 final head: `184edbe37a9b5a3ccbcf8fd3ea768458ede088b1`.

Before Wave 44 changes, `src/lib/builder/templates/editorial-atelier.ts` had blob SHA `19b7b0abea703dba35d3ad25482508d3f6ecf117` both at the historical Wave 25 final head and on the Wave 43 inherited baseline. This proves that the canonical template implementation was inherited unchanged into the re-acceptance stack.

## Stacked baseline

Wave 44 branch:

`feature/storefront-editorial-atelier-wave44`

Created directly from Wave 43 final head:

`a5e0a59b63c96f404cba08373ef17a981bb700cb`

Required stacked PR base:

`feature/storefront-monarche-wave43`

No rebase onto `main` was performed.

The inherited customer baseline manifest remains the storefront-stack baseline:

- status: `ready`
- `freshInstallProofRequired: false`
- previously proven genuine Fresh Install run: `34346892406`

Wave 44 introduces no customer/database migration, so the newer production-main customer migration state is deliberately not pulled into this storefront branch.

## Canonical template contract

Template key: `fashion.editorial-atelier`

Template version: `1`

Merchant-facing fallback brand: `Atelier Nova`

Category: `fashion-apparel`

Position: editorial / asymmetric / campaign-led luxury.

The canonical visual identity remains:

- fashion-magazine-meets-premium-commerce;
- broken-white / sand-beige / ink-black foundation;
- merchant-replaceable accent;
- high-contrast editorial serif display typography;
- modern clean sans-serif UI typography;
- large campaign imagery and editorial negative space;
- asymmetric story-before-grid composition;
- explicitly not a Monarche balanced-retail reskin and not a Street Drop clone.

Protected Home narrative:

1. Magazine Cover Hero
2. Issue Statement
3. Campaign Story I
4. Campaign Story II
5. The Edit
6. Shop the Story
7. Featured Silhouettes
8. Journal
9. Newsletter
10. Footer

Protected asymmetry:

- Campaign I image right;
- Campaign II image left;
- The Edit: restrained 3-column selection;
- Featured Silhouettes: 2-column story-led composition.

Builder hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Builder invariants:

- stable node IDs;
- stable binding paths;
- shared Desktop / Tablet / Mobile responsive grid;
- 14 Alap-compatible page presets;
- no template-local Builder engine;
- no Visual Builder drag/drop, live canvas or inline editing implementation in this wave.

## Shared authority boundaries

Full experience continues to compose shared engines:

- E1 — shared Page Schema/runtime;
- E2 — catalog/search/product eligibility authority;
- E10 — campaign/Journal/lookbook/editorial story authority;
- E13 — provider-neutral cart/checkout authority;
- optional E7 — source-supplied structured product facts.

The template must not invent or own price, stock, inventory, rating, review, material, fit, sizing, product eligibility, checkout, payment or order truth.

The approved Pro opportunity remains `shop-the-look-interactive-scene`, but the implementation boundary is still a future shared Interactive Scene / Composer engine. Alap remains complete with an editorial split story plus authoritative recommendation fallback. Wave 44 does not create a template-local hotspot engine.

The PDP contract remains desktop/tablet 7/12 gallery + 5/12 buybox and mobile 12/12 + 12/12, with commerce truth bound through shared namespaces including `pricing.displayPrice`, `inventory.stockLabel`, `variant.sizeOptions` and `commerce.purchaseHref`.

Checkout remains shared E13 and provider-neutral. The guided accordion is a shared checkout-runtime boundary, not an Atelier-specific checkout engine.

## Contract-first gate

Wave 44 first introduced only:

- `src/lib/builder/templates/editorial-atelier-wave44-acceptance.ts`
- `tests/storefront-editorial-atelier-wave44-reacceptance.test.ts`

First exact gate head:

`617e889209a128eed8b400349c00e446b7c5e9ed`

CI #2488 / Actions run `34530312743` failed at Quality while customer baseline and security passed.

The mandatory downloaded quality artifact was:

- artifact: `10173245109`
- name: `quality-test-results`
- digest: `sha256:5f81e6e531652e1b26868111de89bb5afc176f3a20e6c36050cdcfa9e00260a2`
- locally recomputed ZIP SHA-256 matched the GitHub digest exactly.

Artifact inspection reported:

- 466 total suites;
- 464 passed suites;
- 1696 total tests;
- 1692 passed tests;
- 4 failed assertions, all in the new Wave 44 acceptance file.

Two root causes were proven:

1. The new hotspot assertion used a greedy JSON-string regex and incorrectly matched the word `hotspot` inside ordinary fallback copy even though no hotspot/interactive-scene component key existed. This was an acceptance-test bug, not an inherited runtime defect.
2. The inherited Catalog page violated the current stable-node-ID contract. `header('atelier-catalog')` generated node ID `atelier-catalog-header`, while the nested `commerce.collection-header` used the same ID. Current fail-closed validation therefore returned `NODE_ID_DUPLICATE`.

No speculative repair was made before artifact inspection.

## Evidence-backed hardening

Only the artifact-proven deviations were changed:

1. The Wave 44 hotspot test now inspects actual component keys rather than greedily matching the entire serialized page.
2. The inherited Catalog `commerce.collection-header` node ID changed from `atelier-catalog-header` to `atelier-catalog-collection-header`.

The inherited template change is exactly one line: 1 addition / 1 deletion. No visual structure, binding path, shared registry, runtime allowlist, binding namespace, commerce authority or page order changed.

Accepted implementation head:

`62985f1026835cbd1ff11393736b7d1e11217c71`

Implementation diff versus Wave 43 final base `a5e0a59b63c96f404cba08373ef17a981bb700cb`:

- 4 commits ahead;
- 0 behind;
- 3 changed paths before this evidence document;
- new Wave 44 acceptance contract;
- new Wave 44 acceptance tests;
- inherited Editorial Atelier template modified only by the one node-ID correction;
- no SQL or migration file;
- no shared runtime/registry widening.

## Accepted implementation CI

Exact-head CI:

- CI #2494
- Actions run `34530799652`
- exact SHA `62985f1026835cbd1ff11393736b7d1e11217c71`
- conclusion: SUCCESS

Verified CI gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- Quality: PASS;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install proof: intentionally SKIPPED because this wave introduces no migration.

Downloaded implementation quality artifact:

- artifact id: `10173406139`
- digest: `sha256:62985a50afec1281d2e4298d07762572b2501abb3a392091133d4f139a9b9983`
- recomputed downloaded ZIP SHA-256: exact match;
- 466 / 466 suites PASS;
- 1696 / 1696 tests PASS;
- Wave 44 re-acceptance: 11 / 11 assertions PASS;
- 0 failed / 0 pending / 0 todo.

Downloaded implementation release artifact:

- artifact id: `10173451757`
- digest: `sha256:1e17727495c39c452bd83a94f811c8fe706c7925c876fffeec09233eb4b015d9`
- recomputed downloaded ZIP SHA-256: exact match.

Inspected release manifest:

- version: `v24`
- SHA: `62985f1026835cbd1ff11393736b7d1e11217c71`
- ref: `feature/storefront-editorial-atelier-wave44`
- environment: `ci`
- release hash: `24ebc2a65299c4b5faa423066e0b5b3f6ff9f93ac4cb204de8389dd9b890079d`

## Environment invariants

Wave 44 performs no Supabase mutation and no production deployment.

The verified production/staging state entering the wave was:

- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging Supabase `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- Water-K tenant id `56ffdbca-0614-4175-8c56-6255d38d7f53`;
- slug `water-k`;
- status `pilot`;
- subscription plan `pro`.

The independent production `main` entering Wave 44 was `723ce76973b6b16055db25ec489954adb0edb088` (Product Intake Center v1 / #212). Production `/api/health` returned HTTP 200 with `status: ok`, `database: ok`, and version `723ce76973b6`.

These production invariants are not modified by Wave 44.

## Final closure protocol

This evidence-document commit must itself receive a fresh exact-head green CI. After that run completes, the final quality and release artifacts must be downloaded, digest-verified and inspected again; the release manifest SHA must equal that documentation final HEAD. The final Git-linked Vercel preview must be `READY`, `target=null`, and reference the same exact final HEAD. Only then may the stacked Draft PR be opened against `feature/storefront-monarche-wave43` and its mergeability/exact diff verified.

No production deployment, Supabase mutation, tenant status/plan change, `main` merge or Wave 45 work is authorized by this document.
