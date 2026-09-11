# Storefront Scale-out Wave 35 — Table & Gift Re-acceptance & Builder Hardening

## Scope reconstruction

Wave 35 re-accepts the already-existing canonical **Table & Gift** template directly after the fully closed Gallery Edit Wave 34. The historical accepted scale-out chain records Table & Gift directly on top of Gallery Edit, so Wave 35 does not invent a new template or roadmap slot.

Canonical identity remains:

- template key: `food.table-gift`;
- template version: `1`;
- category: `food-gifting`;
- demo namespace: `food-table-gift`;
- minimum plan: `alap`.

Branch:

`feature/storefront-table-gift-wave35`

Stacked base branch:

`feature/storefront-gallery-edit-wave34`

Exact accepted Wave 34 baseline:

`ad2709286200692d3f39c51e77c019c0fec0c948`

Accepted implementation head before this documentation commit:

`48deaae5dd31b26be395dec1993de1d6f94f0598`

## Accepted Table & Gift direction

Table & Gift remains:

**premium gifting / occasion commerce × curated food/gift selection × configurable gifting**

Visual DNA remains:

- ivory background;
- deep burgundy primary;
- forest green secondary;
- champagne accent;
- black text;
- elegant editorial serif display typography;
- clean sans-serif interface typography;
- gift boxes, ribbon, premium table settings, curated food/drink packaging and editorial still-life imagery;
- generous, celebratory, refined spacing.

Accepted shopping journey remains:

`guided gift choice → occasion → curated set → composed gift → gift message → corporate contact / checkout`

Table & Gift remains intentionally distinct from:

- **Gallery Edit** — airy object/room/material gallery curation with large negative space;
- **Market Pantry** — pantry/market/composer-first grocery commerce.

Table & Gift is occasion-, recipient- and gifting-first.

Explicit exclusions remain:

- Market Pantry duplication;
- rustic/farmhouse treatment;
- promotion chaos;
- fabricated fixed-price gift boxes;
- virtual bundle SKUs;
- fake scarcity;
- baked marketing copy inside demo imagery.

## Shared engine and authority contract

Wave 35 preserves the historical accepted engine contract exactly:

- **E1** Storefront Runtime / Page Schema;
- **E2** Product Discovery and catalog/channel eligibility authority;
- **E3** Guided Finder for occasion, recipient and preference guidance;
- **E4** Multi-Product Composer for real catalog product composition;
- **E13** provider-neutral cart/checkout and final commerce revalidation.

Required full experience remains:

`E1 + E2 + E3 + E4 + E13`

**E10 is not added.** No new Story dependency is introduced.

Authority rule remains:

`gift-guidance-and-composition-never-invent-price-stock-eligibility-message-delivery-or-order-authority`

The template is not authority for:

- product eligibility;
- price or compare-at price;
- inventory or stock availability;
- variants;
- reviews;
- checkout outcome;
- payment state;
- gift-message persistence;
- corporate pricing, MOQ, approval or B2B status;
- virtual bundle SKUs or fixed bundle pricing.

## Exact Home contract

The accepted Home sequence remains unchanged:

1. Gift Builder
2. Shop by Occasion
3. Curated Gift Sets
4. Build Your Gift
5. Gift Message
6. Corporate Gift CTA
7. Footer

Wave 35 explicitly does **not** add:

- Gift Hero;
- Gift Story;
- Reviews.

## Wave 35 Builder hardening

### E3 Gift Builder

The existing shared `guided.finder` is retained. Wave 35 exposes every currently supported binding slot without creating a Table & Gift-specific Finder engine.

Stable content/presentation roots include:

- `content.giftBuilder.eyebrow`;
- `content.giftBuilder.title`;
- `content.giftBuilder.copy`;
- `content.giftBuilder.actionLabel`.

Dynamic Finder state remains under shared E3 bindings:

- `finder.currentStep.title`;
- `finder.currentStep.copy`;
- `finder.currentQuestion.label`;
- `finder.currentQuestion.options`;
- `finder.progressLabel`;
- `finder.resultHref`;
- `finder.resultStatus`.

E3 remains guidance/ranking only and cannot override E2 eligibility or commerce truth.

### E4 Build Your Gift

The existing shared `composer.builder` remains the only composition engine. Wave 35 exposes every supported binding slot while keeping composition state external.

Stable content/presentation bindings include:

- `content.buildYourGift.eyebrow`;
- `content.buildYourGift.title`;
- `content.buildYourGift.copy`;
- `content.buildYourGift.summaryLabel`;
- `content.buildYourGift.actionLabel`;
- `content.buildYourGift.revalidationLabel`.

Dynamic composition bindings remain under shared E4 paths:

- `composer.modeLabel`;
- `composer.progressLabel`;
- `composer.slots`;
- `composer.availableItems`;
- `composer.currentSubtotal`;
- `composer.currency`;
- `composer.actionHref`.

No virtual bundle SKU, fixed gift price, discount, stock or substitution authority is introduced.

### Gift Message and Corporate Gift CTA

Both existing `editorial.split-feature` nodes now expose all supported shared presentation slots:

- eyebrow;
- title;
- copy;
- image;
- imageAlt;
- CTA label;
- CTA href.

Stable roots:

- `content.giftMessage.*`;
- `content.corporateGift.*`.

Gift Message remains presentation-only; persistence and final order/delivery handling remain external to the template.

Corporate Gift remains contact/presentation-only; no corporate pricing, quote, MOQ, approval or B2B authority is introduced.

### Catalog, PDP and cart hardening

Wave 35 adds stable supported bindings without changing commerce authority:

- Shop by Occasion title → `content.shopByOccasion.title`;
- Catalog occasion title → `content.catalogOccasion.title`;
- PDP presentation eyebrow → `content.productInfo.eyebrow`;
- PDP E3 explanation title → `content.productGiftFit.title`;
- recommendation title → `content.productRecommendations.title`;
- cart composition summary title/revalidation copy → `content.cartGiftSummary.*`.

Product price, compare-at price, stock, gallery, purchase target and recommendations remain shared authoritative bindings.

### Simple page presets

Account, Blog Index, Blog Article, FAQ, Contact, Legal and Not Found keep the existing shared primitive structure and now expose stable `content.<pageType>.title` / `content.<pageType>.copy` bindings.

### Checkout binding correction discovered by the acceptance gate

The inherited Table & Gift checkout used two historical binding paths:

- `checkout.giftMessageLabel`;
- `checkout.giftMessageHelp`.

The current shared runtime namespace allowlist does not contain a `checkout` binding namespace. The first Wave 35 acceptance CI therefore correctly failed with `BINDING_PATH_NOT_ALLOWED`.

Wave 35 did **not** weaken or expand the shared runtime allowlist. The template was corrected to existing allowed content bindings:

- `content.checkoutGiftMessage.title`;
- `content.checkoutGiftMessage.copy`.

E13 remains the checkout authority. This correction is a template contract hardening, not a new checkout engine or authority change.

## Product page responsive contract

The accepted PDP grid remains unchanged:

- Desktop: gallery 7/12, buybox 5/12;
- Tablet: gallery 7/12, buybox 5/12;
- Mobile: gallery 12/12, buybox 12/12.

E3 explanation evidence remains explanatory only and cannot change product eligibility, price, stock or checkout state.

## Page package and Builder foundation

The canonical package remains all 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Gift Builder Hub
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Content role remains `gift-builder-hub` with `E3+E4` integration.

Desktop / Tablet / Mobile manifest support remains enabled.

The hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Installation remains draft-only. Template installation cannot mutate authoritative products, variants, customers, orders or B2B ownership.

No drag/drop Visual Builder, live canvas, inline editing implementation or Table & Gift-specific Builder engine is introduced.

## CI acceptance execution

The repository Vitest include remains:

`tests/**/*.test.ts`

The inherited historical regression `tests/storefront-table-gift-template.test.tsx` is therefore not used as Wave 35 closure evidence.

Wave 35 adds the CI-executed acceptance file:

`tests/storefront-table-gift-wave35-reacceptance.test.ts`

It contains **10 acceptance assertions/tests** covering:

1. inherited canonical v1 identity and exact E1/E2/E3/E4/E13 contract;
2. visual/structural separation from Gallery Edit and Market Pantry;
3. exact seven-step Home sequence and rejected extra sections;
4. complete Guided Finder binding surface and E3 authority boundary;
5. complete Composer binding surface and E4 authority boundary;
6. fully bindable Gift Message / Corporate Gift shared presentation surfaces;
7. unique node identity, all 14 Alap presets, tokens and D/T/M support;
8. PDP authoritative bindings, E3 explanation and responsive grid;
9. draft-only installation and claim-neutral demo fixtures;
10. E13 provider-neutral checkout and release-side-effect boundaries.

## Failed first candidate — retained as evidence

First Wave 35 candidate implementation head:

`0085612ed608048e728e107169ee4af281783273`

GitHub CI **#2342 / run `34503848806`: FAILURE**.

The quality artifact was actually downloaded and inspected:

- artifact id: `10163021718`;
- digest: `sha256:4a6c4d18822b9bd14114871acc9d5d931dd49628d9d8e196d18835c4cb158e68`;
- total suites: 448;
- passed suites: 446;
- failed suites: 2;
- total tests: 1594;
- passed tests: 1592;
- failed tests: 2;
- pending: 0;
- todo: 0.

Both failures traced to the inherited invalid `checkout.*` binding namespace. TypeScript/build/release-manifest were correctly skipped after the quality failure.

The fix changed only the two template binding paths; the shared runtime namespace allowlist was not modified.

## Accepted implementation CI

Accepted implementation head:

`48deaae5dd31b26be395dec1993de1d6f94f0598`

GitHub **CI #2345 / Actions run `34504360408`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **223 unique test files / 448 suites / 1594 tests PASS**;
- passed tests: 1594;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 35 acceptance: **10 / 10 PASS**, explicitly present in the downloaded quality artifact;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 35 introduces no database migration.

Implementation quality artifact:

- artifact id: `10163195307`;
- digest: `sha256:bb94f6a9c590768ab2fea548ec600210834fd0df8870e83865837dd6722f2f06`;
- artifact was actually downloaded and `test-results.json` inspected.

Implementation release-manifest artifact:

- artifact id: `10163245668`;
- digest: `sha256:02a49ed1de60cf408c804ebbe52a06920f2ad50df68a4dcd1b38fb7d457611a8`;
- artifact was actually downloaded and `release-manifest.json` inspected;
- version: `v24`;
- SHA: `48deaae5dd31b26be395dec1993de1d6f94f0598`;
- ref: `feature/storefront-table-gift-wave35`;
- environment: `ci`;
- release hash: `cebd5e291c32616b45ae93ef102a8bc188806b0e89a41305d5226d22ee34c381`.

## SQL / payment / production boundary

Wave 35 is code-only and requires no SQL or migration.

Wave 35 introduces no:

- production Vercel promotion;
- Supabase mutation;
- main merge;
- payment-provider runtime change;
- K&H/vPOS logic;
- provider secret or merchant credential;
- callback/process/status handling;
- payment-state authority;
- shared E2/E3/E4/E13 authority widening;
- Water-K tenant-status change.

Automatic Git integration Preview deployments are allowed and are not production rollout.

At Wave 35 start, production Vercel remained independently on `main` SHA `cdd493b2ac4f6635f666cac164019090039dbcc6`. Production Supabase `waterk-platform` / `ewdederyvnwmghlydbno` was `ACTIVE_HEALTHY`; Water-K remained `pilot` / `pro`.

## Final documentation-head verification

This documentation commit is the docs/evidence head candidate for Wave 35. Closure requires a new full GitHub CI on this exact documentation HEAD and fresh download/inspection of both final `quality-test-results` and `release-manifest` artifacts.

The final exact-head totals, Wave 35 regression presence/count and final release hash are recorded in the stacked Draft PR as exact-head external closure evidence to avoid an evidence-commit loop.

## Closure rule

Wave 35 is fully closed only after:

1. this documentation HEAD passes full exact-head CI;
2. final quality and release-manifest artifacts are actually downloaded and inspected;
3. final exact totals and Wave 35 10/10 acceptance presence are verified;
4. final exact diff is verified against Wave 34 accepted head `ad2709286200692d3f39c51e77c019c0fec0c948`;
5. a stacked Draft PR targets `feature/storefront-gallery-edit-wave34`;
6. PR is open, Draft, not merged, mergeable, rebaseable and clean after preview status settles;
7. production Vercel remains unpromoted;
8. production Supabase remains unchanged;
9. Water-K remains `pilot` / `pro`;
10. checkout remains provider-neutral E13;
11. Wave 36 is not started.
