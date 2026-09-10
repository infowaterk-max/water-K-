# Storefront Scale-out Wave 33 — Alpine Lodge Re-acceptance & Builder Hardening

## Scope reconstruction

Wave 33 is the next accepted storefront scale-out step after the completed Beauty & Wellness re-acceptance sequence and opens the next Outdoor & Lifestyle position with the already-existing canonical **Alpine Lodge** template.

This is therefore a **current-baseline re-acceptance and Builder-hardening wave**, not a new template implementation.

Canonical identity remains:

- template key: `outdoor.alpine-lodge`;
- template version: `1`;
- category: `outdoor-lifestyle`;
- demo namespace: `outdoor-alpine-lodge`;
- minimum plan: `alap`.

The historical canonical implementation already exists from Wave 14 in `src/lib/builder/templates/alpine-lodge.ts`, with its original 14-page package and demo fixtures. Wave 33 does not create a duplicate template key or namespace.

Branch:

`feature/storefront-alpine-lodge-wave33`

Stacked base branch:

`feature/storefront-beauty-lab-wave32`

Exact accepted Wave 32 baseline:

`41110a298a53ee2d60e3df388f554992e0d5af4b`

Accepted implementation head before this documentation commit:

`cf8974aedf47298e6da4b9a2693f840296398513`

## Accepted Alpine Lodge direction

Alpine Lodge remains a premium Swiss boutique-lodge inspired outdoor/lifestyle storefront rather than a generic sport or expedition shop.

Visual DNA remains:

- warm natural luxury;
- dark timber;
- stone;
- wool and tactile natural materials;
- misty alpine / forest blue-grey atmosphere;
- restrained copper/bronze details;
- calm, generous spacing;
- refined editorial serif + clean interface sans typography.

Explicit exclusions remain:

- red-dominant or terracotta-dominant chalet styling;
- Christmas-alpine cliché;
- sterile white luxury;
- rustic theme-park styling;
- invented technical performance claims;
- invented origin, certification or sustainability claims.

Accepted shopping journey remains:

`collection → layer or use context → material → product → story`

This is structurally distinct from the existing Trail & Expedition direction, which is dark, cinematic and route-first. Alpine Lodge is warm-natural, material/layer-led and boutique-lodge editorial commerce rather than route/safety/difficulty-led expedition discovery.

## Shared engine and authority contract

Alpine Lodge continues to consume only shared systems:

- **E1** Storefront Runtime / Page Schema;
- **E2** Product Discovery authority;
- **E7** structured material, fit, care and supplied product attributes;
- **E10** editorial / Story surfaces;
- **E13** provider-neutral Checkout.

No Alpine-specific commerce, checkout, recommendation, product-data, review, payment or persistence engine is introduced.

Authority rule remains:

`template-presents-editorial-and-structured-evidence-but-never-invents-performance-origin-sustainability-price-stock-or-checkout-authority`

The template is never authority for price, compare-at price, inventory, variants, availability, review truth, eligibility, structured product truth, order state, checkout outcome or payment status.

## Wave 33 Builder hardening

### Alpine Hero

The inherited monolithic `story.hero` surface is replaced by the already-existing shared Story + Visual composition:

- `visual.layered-canvas`;
- `visual.layer`.

The hero now has eight independently addressable Builder layers with stable node identity:

1. image;
2. overlay;
3. decoration;
4. eyebrow;
5. heading;
6. copy;
7. primary CTA;
8. secondary CTA.

Editable bindings remain under the stable `content.alpineHero.*` root. Marketing copy, price, rating, stock, product facts, technical-performance claims, origin/sustainability claims and CTA content are not baked into hero imagery.

No Alpine-specific hero/layout engine was created.

### Reviews contract

The inherited Alpine Reviews node used the obsolete `summary` / `href` slots and fabricated `0` rating/count fallbacks.

Wave 33 aligns the template with the current shared `commerce.review-summary` contract:

- only `rating`, `count`, `label` are used;
- `rating` and `count` fallback to `null`;
- review truth remains external under the shared `reviews.*` read model;
- no shared review capability or authority was widened.

### Journal binding

The old `story.journal.items` binding is replaced on Home and Blog Index with the already allowlisted shared content read path:

`content.journal.items`

No new binding namespace is introduced.

### Stable node identity

The inherited Catalog page generated `alpine-catalog-header` for both the shared system header and the collection header.

The collection header now uses the distinct stable id:

`alpine-catalog-collection-header`

No Page Schema contract was widened.

## Home merchandising contract

The accepted Home order remains unchanged:

1. Alpine Hero
2. Shop by Collection
3. Seasonal Layers
4. Material Story
5. Featured Collection
6. Lodge Essentials
7. Crafted Details
8. Reviews
9. Field Journal
10. Footer

## Product page

The accepted PDP grid remains:

- Desktop: gallery 7/12, buybox 5/12;
- Tablet: gallery 7/12, buybox 5/12;
- Mobile: gallery 12/12, buybox 12/12.

Authoritative bindings remain responsible for gallery, product name/description, price/compare-at price, stock, variants, material/fit/care facts, purchase action and recommendations.

Missing structured product evidence remains missing. Alpine Lodge does not infer waterproofing, windproofing, provenance, certifications or sustainability claims.

## Page package

The canonical package remains all 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Desktop / Tablet / Mobile manifest support remains enabled.

Installation remains draft-only and cannot mutate authoritative merchant products, variants, customers, orders or B2B ownership.

## CI regression execution hygiene

The repository's current Vitest include remains:

`tests/**/*.test.ts`

The historical Alpine regression is `.test.tsx`, so Wave 33 does not rely on it as current acceptance evidence.

Wave 33 adds the CI-executed regression:

`tests/storefront-alpine-lodge-wave33-reacceptance.test.ts`

The global Vitest include scope is not broadened.

Wave 33 regression assertions on the accepted implementation CI: **10 / 10 PASS**.

The regression explicitly covers:

- inherited canonical `outdoor.alpine-lodge` v1 re-acceptance rather than duplicate creation;
- approved boutique-lodge visual identity and structural separation from Trail & Expedition;
- exact Home merchandising order;
- shared Story + Visual hero composition and stable bindings;
- shared story-slot editability without product-fact authority;
- unique node identity across all pages;
- all 14 Alap presets and Desktop / Tablet / Mobile compatibility;
- review truth staying external;
- current journal binding path;
- PDP authority bindings and responsive 7/5 → 12/12 contract;
- draft-only installation and claim-neutral demo fixtures;
- provider-neutral E13 checkout;
- release/deploy/SQL/payment operations remaining out of scope.

## Accepted implementation CI

Implementation head:

`cf8974aedf47298e6da4b9a2693f840296398513`

GitHub **CI #2316 / Actions run `34497067356`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **221 unique test files / 444 suites / 1572 tests PASS**;
- passed: 1572;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 33 regression: **10 / 10 PASS**, explicitly present in the quality artifact;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 33 introduces no database migration.

Quality artifact:

- artifact id: `10160253561`;
- digest: `sha256:bbda32b99140647e159a31bfe21b7174ff71024dd8d263548fdb0f768958f8cb`.

Implementation release manifest:

- artifact id: `10160295578`;
- artifact digest: `sha256:f429aa191f4bb2eae28b772e38bb0e140cc29ace80dd20ea4ea87d9869cff4e5`;
- version: `v24`;
- SHA: `cf8974aedf47298e6da4b9a2693f840296398513`;
- ref: `feature/storefront-alpine-lodge-wave33`;
- environment: `ci`;
- release hash: `07c22538eb9e263b61cfa252bfa761cffef8f96077f8387bba59ef80330fefce`.

## SQL / deployment / payment boundary

Wave 33 is code-only. No SQL or migration is required.

Wave 33 does not authorize or perform:

- merge to `main`;
- Vercel production deployment or promotion;
- Supabase production/staging mutation;
- K&H/vPOS/payment-provider behavior changes;
- payment secret or callback changes;
- Water-K tenant status changes;
- Visual Builder drag/drop implementation.

An automatic branch Preview, if generated by Git integration, is not a production rollout.

## Final documentation-head verification

This documentation commit is the final evidence/docs commit for Wave 33. Closure requires a fresh full GitHub CI on this exact documentation HEAD, followed by separate processing of its `quality-test-results` and `release-manifest` artifacts.

The final current-head test totals and final release hash are recorded as external exact-head closure evidence and in the Draft PR after the run, avoiding an evidence-commit loop.

## Closure rule

Wave 33 closes only when:

1. this documentation HEAD passes a fresh full exact-head GitHub CI;
2. final quality and release-manifest artifacts are processed separately;
3. final exact test totals, Wave 33 regression presence/count and final release hash are recorded;
4. final diff is verified against exact Wave 32 accepted head `41110a298a53ee2d60e3df388f554992e0d5af4b`;
5. the stacked Draft PR targets `feature/storefront-beauty-lab-wave32`;
6. PR state is open, Draft, not merged, mergeable and preferably rebaseable/clean;
7. production Vercel remains unpromoted;
8. production Supabase remains unchanged;
9. payment behavior remains unchanged;
10. Water-K remains `pilot`.
