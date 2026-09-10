# Storefront Scale-out Wave 34 — Gallery Edit Re-acceptance & Builder Hardening

## Scope reconstruction

Wave 34 follows the accepted Alpine Lodge re-acceptance closure and re-accepts the already-existing canonical **Gallery Edit** template. The historical scale-out order records Gallery Edit directly after Alpine Lodge and before Table & Gift, so this wave does not invent a new template slot or roadmap item.

Canonical identity remains:

- template key: `home.gallery-edit`;
- template version: `1`;
- category: `home-living-design`;
- demo namespace: `home-gallery-edit`;
- minimum plan: `alap`.

The inherited canonical implementation remains in `src/lib/builder/templates/gallery-edit.ts`. Wave 34 does not create a second Gallery Edit template, key or namespace.

Branch:

`feature/storefront-gallery-edit-wave34`

Stacked base branch:

`feature/storefront-alpine-lodge-wave33`

Exact accepted Wave 33 baseline:

`599dbb930e49fb2caa80be4c44edcec4425d78a1`

Accepted implementation head before this documentation commit:

`cffcbc83bc9ff40168121327eba4a0d2a61f437a`

## Accepted Gallery Edit direction

Gallery Edit remains a contemporary interior/design concept-store × gallery rather than a generic furniture marketplace.

Visual DNA remains:

- chalk/off-white background;
- limestone-grey surfaces;
- graphite typography;
- one restrained curatorial accent;
- editorial grotesk or refined-serif display direction;
- clean sans-serif interface typography;
- furniture, lighting, ceramics, textiles and objects presented as gallery pieces;
- large negative space;
- airy, precise gallery-scale spacing.

Accepted shopping journey remains:

`edit → room or object type → material → object → story`

Explicit exclusions remain:

- busy marketplace composition;
- rustic farmhouse treatment;
- overloaded gold-luxury styling;
- streetwear visual language;
- fabricated designer provenance;
- fabricated material claims;
- baked marketing copy inside demo imagery.

Gallery Edit is structurally distinct from the previous Alpine Lodge direction: Alpine Lodge is warm-natural boutique-lodge commerce led by layers/materials/use context, while Gallery Edit is airy object/room/material curation with gallery-scale negative space. It is also distinct from the historically next Table & Gift direction, which is occasion-, recipient- and gifting-first commerce.

The original Wave 15 evidence explicitly recorded that an exact earlier Gallery Edit screenshot/pixel reference was not recoverable with sufficient confidence. Wave 34 therefore does not invent one or claim pixel-diff acceptance. It re-accepts the canonical structural visual contract and hardens it against the current Builder/runtime contracts.

## Shared engine and authority contract

Gallery Edit continues to consume only shared Shoporation systems:

- **E1** Storefront Runtime / Page Schema;
- **E2** Product Discovery authority;
- **E7** structured material, dimension, finish, care and supplied product facts;
- **E10** editorial / Story surfaces;
- **E13** provider-neutral Checkout.

No Gallery-specific commerce, material, designer, recommendation, review, pricing, inventory, checkout, payment or persistence authority is introduced.

Authority rule remains:

`gallery-presentation-never-invents-designer-provenance-material-dimensions-price-stock-or-availability`

The template is never authority for price, compare-at price, inventory, stock availability, variants, reviews, product eligibility, structured product truth, checkout outcome, order state or payment state.

## Wave 34 Builder hardening

### Gallery Hero

The inherited monolithic `story.hero` is replaced by the existing shared Story + Visual composition:

- `visual.layered-canvas`;
- `visual.layer`;
- common content image/text/heading/button components.

The hero now exposes six independently addressable layers with stable node identity:

1. image;
2. overlay;
3. eyebrow;
4. heading;
5. copy;
6. primary CTA.

Editable bindings remain under the stable `content.galleryHero.*` root:

- `content.galleryHero.image`;
- `content.galleryHero.imageAlt`;
- `content.galleryHero.eyebrow`;
- `content.galleryHero.title`;
- `content.galleryHero.copy`;
- `content.galleryHero.primaryLabel`;
- `content.galleryHero.primaryHref`.

Marketing copy, price, rating, stock, product facts, provenance/material claims and CTA content remain outside demo imagery. Existing Gallery Edit SVG assets contain only deterministic abstract visual geometry plus accessibility metadata, not baked storefront marketing copy.

No Gallery-specific hero or layout engine is created.

### Story feature editability

The inherited shared `story.feature` helper previously bound only title, copy and image. Wave 34 keeps the same shared component and exposes all supported story slots through stable roots:

- eyebrow;
- title;
- copy;
- image;
- imageAlt;
- ctaLabel;
- ctaHref.

This applies to Designer / Studio Story, Product Story and Gallery Content surfaces without granting designer provenance or material-truth authority to the template.

### Reviews contract

The inherited Gallery Reviews node used obsolete `summary` / `href` slots and fabricated `0` rating/count fallbacks.

Wave 34 aligns the template with the current shared `commerce.review-summary` contract:

- only `rating`, `count`, `label` are used;
- `rating` and `count` fall back to `null`;
- review truth remains external under shared `reviews.*` bindings;
- no shared review capability or authority is widened.

### Journal binding

The inherited Home and Blog Index used `story.journal.items`.

Wave 34 moves both to the current allowlisted shared content read path:

`content.journal.items`

No new binding namespace or Story authority is introduced.

### Stable node identity

The inherited Catalog page generated `gallery-catalog-header` both for the shared system header and the collection header.

The collection header now uses the distinct stable id:

`gallery-catalog-collection-header`

Wave 34 regression validates unique node identity recursively across all 14 pages.

### Simple content pages

Account, Blog Article, FAQ, Contact, Legal and Not Found keep their existing shared heading/text structure, but their heading/copy content now has stable `content.<pageType>.title` and `content.<pageType>.copy` bindings so these presets remain Builder-ready without a one-off editor.

## Home merchandising contract

The accepted Home order remains unchanged:

1. Gallery Hero
2. Curated Rooms
3. New Objects
4. Designer Story
5. Material Edit
6. Gallery Grid
7. Featured Edit
8. Reviews
9. Journal
10. Footer

## Product page

The accepted PDP grid remains:

- Desktop: gallery 7/12, buybox 5/12;
- Tablet: gallery 7/12, buybox 5/12;
- Mobile: gallery 12/12, buybox 12/12.

Authoritative shared bindings remain responsible for:

- product gallery;
- product name and description;
- price and compare-at price;
- stock label;
- variants/options;
- E7 key specs and grouped structured facts;
- purchase action;
- recommendations.

Missing material, dimension, finish, care or provenance evidence remains missing. Gallery Edit does not infer it.

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

## Checkout and payment boundary

Checkout remains bound to shared **E13** and provider-neutral.

Wave 34 introduces no:

- K&H/vPOS logic;
- provider secret;
- merchant credential;
- callback/process/status handling;
- payment-state authority;
- provider-specific checkout engine.

## CI regression execution hygiene

The repository's current Vitest include remains:

`tests/**/*.test.ts`

The historical Gallery Edit regression is `.test.tsx`, so Wave 34 does not rely on it as current acceptance evidence.

Wave 34 adds the CI-executed regression:

`tests/storefront-gallery-edit-wave34-reacceptance.test.ts`

The global Vitest include is not broadened.

Implementation-head Wave 34 regression result: **10 / 10 PASS**.

The regression covers:

- inherited canonical `home.gallery-edit` v1 re-acceptance rather than duplicate creation;
- visual/structural separation from Alpine Lodge and Table & Gift;
- exact Home order;
- shared layered hero composition and stable bindings;
- full shared story-slot editability without provenance/material authority;
- unique node identity across all pages;
- all 14 Alap presets and Desktop / Tablet / Mobile compatibility;
- current Reviews contract and external review truth;
- current journal content binding path;
- authoritative PDP bindings and 7/5 → 12/12 responsive contract;
- draft-only installation and claim-neutral demo fixtures;
- provider-neutral E13 checkout;
- SQL/deploy/payment/main merge remaining outside scope.

## Accepted implementation CI

Implementation head:

`cffcbc83bc9ff40168121327eba4a0d2a61f437a`

GitHub **CI #2332 / Actions run `34501360560`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **222 unique test files / 446 suites / 1583 tests PASS**;
- passed: 1583;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 34 regression: **10 / 10 PASS**, explicitly present in the downloaded quality artifact;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 34 introduces no database migration.

Implementation quality artifact:

- artifact id: `10162019846`;
- digest: `sha256:17ead804dd94dd58d377fd8c753959963d8a42d43aaa698e5d44d605546b152c`;
- artifact was downloaded and `test-results.json` was inspected directly.

Implementation release manifest artifact:

- artifact id: `10162071419`;
- artifact digest: `sha256:6137d37892ab68936730baebdfde34df2d672e6e462dad5a13d18e29e915ea4c`;
- artifact was downloaded and `release-manifest.json` was inspected directly;
- version: `v24`;
- SHA: `cffcbc83bc9ff40168121327eba4a0d2a61f437a`;
- ref: `feature/storefront-gallery-edit-wave34`;
- environment: `ci`;
- release hash: `d8b3b2017a7438bdbff56bca7ac7d676220d65e5b0d4c2198c1d63018cbabb9e`.

## SQL / deployment / production boundary

Wave 34 is code-only and requires no SQL or migration.

Wave 34 does not authorize or perform:

- merge to `main`;
- Vercel production deployment or promotion;
- Supabase production/staging mutation;
- K&H/vPOS/payment-provider behavior changes;
- payment secret/callback/status changes;
- Water-K tenant status changes;
- Visual Builder drag/drop implementation.

An automatic Git integration Preview is allowed and is not a production rollout.

At Wave 34 start, production Vercel was independently on `main` SHA `cdd493b2ac4f6635f666cac164019090039dbcc6`; Wave 33 remained a non-production Preview at `599dbb930e49fb2caa80be4c44edcec4425d78a1`. Production Supabase `waterk-platform` / `ewdederyvnwmghlydbno` was `ACTIVE_HEALTHY`, and Water-K remained `pilot` / `pro`. Wave 34 performs no mutation to those boundaries.

## Final documentation-head verification

This documentation commit is the docs/evidence head candidate for Wave 34. Closure requires a fresh full GitHub CI on this exact documentation HEAD, followed by separate download and inspection of its `quality-test-results` and `release-manifest` artifacts.

The final exact-head test totals, Wave 34 regression presence/count and final release hash are recorded as external exact-head closure evidence and in the stacked Draft PR, avoiding an evidence-commit loop.

## Closure rule

Wave 34 closes only when:

1. this documentation HEAD passes a fresh full exact-head GitHub CI;
2. final quality and release-manifest artifacts are actually downloaded and inspected;
3. final exact test totals, Wave 34 regression presence/count and final release hash are verified;
4. final diff is verified against exact Wave 33 accepted head `599dbb930e49fb2caa80be4c44edcec4425d78a1`;
5. a stacked Draft PR targets `feature/storefront-alpine-lodge-wave33`;
6. PR state is open, Draft, not merged, mergeable and preferably rebaseable/clean;
7. production Vercel remains unpromoted;
8. production Supabase remains unchanged;
9. payment behavior remains unchanged;
10. Water-K remains `pilot` / `pro`;
11. Wave 35 is not started.
