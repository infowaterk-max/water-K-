# Storefront Scale-out Wave 13 — Ritual House

## Purpose

Wave 13 implements **Ritual House** as the next Beauty & Wellness scale-out template directly on top of Derma Studio / PR #135.

Template key: `beauty.ritual-house`

Base branch: `feature/storefront-derma-studio-wave12`

Base final head: `52bb44be85c47ed364de69ee8a9e958df52cb830`

Implementation head: `115e0c9039bae729708becbd5957f562cd5ff945`

This wave is code-only storefront scale-out. It introduces no SQL migration, live route switch, staging/production mutation, payment change or Water-K status change.

## Agreed product direction

Ritual House is intentionally distinct from both Beauty Lab and Derma Studio.

The retained direction is:

- spa;
- body care;
- aromatherapy-adjacent merchandising without medical claims;
- bath rituals;
- fragrances;
- candles;
- reed diffusers;
- oils;
- creams;
- home wellness;
- warmer, slower, more sensory presentation.

The key visual requirement is that Ritual House is **less white and slightly dark**, with candle/diffuser ambience and a cocooning evening feel. It remains inside Beauty & Wellness and must not collapse into either a classic skincare-routine template or a pure home-decor/fragrance store.

## Distinct shopping journey

Ritual House uses:

`mood → ritual → format → scent or ingredient → product`

This is editorial merchandising and product discovery, not health, diagnosis or aromatherapy outcome authority.

Comparison with adjacent Beauty & Wellness directions:

- Beauty Lab: `formula → ingredient → texture → guided choice → product`
- Derma Studio: `concern → routine → active ingredient → product`
- Ritual House: `mood → ritual → format → scent/ingredient → product`

## Visual DNA

Character:

`warm-dark-sensory-home-wellness-beauty-ritual-commerce`

Palette:

- smoked umber background;
- warm taupe surfaces;
- soft ivory text;
- candle amber primary accent;
- muted sage secondary accent.

Typography:

- soft editorial serif display;
- clean warm sans UI.

Imagery:

- candle;
- diffuser;
- body oil;
- body cream;
- bath/steam;
- glass;
- soft tactile textures.

Spacing:

- slow;
- generous;
- cocooning.

Explicit exclusions:

- clinical skincare;
- medical aromatherapy;
- health outcome claims;
- pure home-decor store positioning;
- cold white lab aesthetic;
- black-box wellness scoring.

## Engine contract

Ritual House reuses the shared storefront engines:

- **E1 Runtime** — common Page Schema/runtime authority;
- **E2 Product Discovery** — catalog/search/channel discovery authority;
- **E7 structured product/specification data** — scent family, format, ingredient and other registered product attributes;
- **E10 Editorial / Story Engine** — ritual, atmosphere and journal content;
- **E13 Checkout** — provider-neutral checkout authority.

No Ritual House-specific recommendation, wellness, scent, pricing, inventory, product or checkout authority is introduced.

Authority rule:

`mood-and-ritual-navigation-is-editorial-merchandising-not-health-or-aromatherapy-outcome-authority`

## Home composition

Exact accepted Home order:

1. Atmosphere Hero
2. Ritual by Mood
3. Bath & Body
4. Home Fragrance
5. Evening Ritual Story
6. Featured Ritual Sets
7. Scent & Ingredient Notes
8. Reviews
9. Journal
10. Footer

### Atmosphere Hero

Establishes the warmer dark visual world with candle, diffuser, oil and cream together. This prevents the template from becoming either Derma Studio-like clinical skincare or a home-fragrance-only storefront.

### Ritual by Mood

Uses shared collection navigation. Mood labels are merchandising taxonomy only and may not encode or imply medical/psychological outcomes.

### Bath & Body

Shared product-grid surface for creams, oils, bath and body products.

### Home Fragrance

Shared product-grid surface for candles, reed diffusers and fragrance formats.

### Evening Ritual Story

Uses E10 `story.feature`. The content can inspire sequencing and atmosphere but cannot promise sleep, anxiety, stress, pain or other health outcomes.

### Featured Ritual Sets

Shared product-grid authority; no template-owned bundle pricing or inventory authority is created.

### Scent & Ingredient Notes

Uses E7 key-spec presentation over structured data. Missing attributes remain missing; the template does not infer scent notes or ingredients.

### Reviews

Shared review-summary read surface.

### Journal

Uses E10 story index for ritual, scent and texture editorial content.

## Catalog and search

Catalog/search remain E2 surfaces and may present registered E7 attributes such as:

- format;
- scent family;
- scent notes;
- ingredient data;
- ritual/use-context metadata where genuinely supplied.

No separate Ritual House eligibility or product-discovery authority exists.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- gallery and buybox reflow to 12/12.

Buybox and detail flow includes:

- common product info;
- generic option selector;
- **Rituálé profil** via E7 key specs;
- purchase CTA;
- grouped **Illat, összetevők és használati adatok** via E7 specification groups;
- E10 editorial `Helye a rituáléban` story feature;
- common related-product/recommendation row.

The editorial ritual block may explain atmosphere or use context, but not health outcomes.

## Content surface

The Content preset uses:

- `contentRole = ritual-guide`
- `engineBinding = E7+E10`

It presents bath, body care, oils, candles, diffusers, formats and scent notes as an editorial/product-navigation guide.

## Package

Ritual House ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Ritual Guide
9. Blog Index / Journal
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan: `alap`

Demo namespace: `beauty-ritual-house`

## Demo fixtures

Namespaced demo content includes:

- collection `evening-rituals`;
- body oil `amber-body-oil`;
- body cream `soft-cream`;
- candle `cedar-candle`;
- reed diffuser `quiet-diffuser`;
- editorial ritual guide.

Deterministic local demo media:

- `public/storefront-demo/ritual-house/atmosphere.svg`
- `public/storefront-demo/ritual-house/evening.svg`
- `public/storefront-demo/ritual-house/ritual.svg`

The demo content is regression-checked against diagnosis, treatment/cure and health/aromatherapy outcome wording.

## Template-install safety

Installation remains draft-only under the established template mutation boundary:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

E7 product data and E10 story authority remain outside template-switch ownership.

## Checkout

Checkout is E13-bound and provider-neutral.

No K&H, vPOS, payment secret or merchant credential is embedded in the Page Schema.

## Regression coverage

Wave 13 verifies:

- exact `beauty.ritual-house` key/version;
- warm dark sensory visual DNA;
- mood/ritual/format/scent-or-ingredient journey;
- exclusions for clinical skincare, medical aromatherapy and health outcomes;
- E1/E2/E7/E10/E13 engine boundary;
- 14 valid Alap-compatible presets;
- exact Home sequence;
- simultaneous body-care and home-fragrance commerce;
- oils, creams, candles and diffusers on the same storefront family;
- E10 hero/story/index rendering;
- PDP 7/12 + 5/12 desktop/tablet and 12/12 mobile reflow;
- E7 ritual profile and scent/ingredient evidence;
- draft-only template install;
- safe demo wording;
- provider-neutral E13 checkout.

## Implementation diff

Compared with Derma Studio final head `52bb44be85c47ed364de69ee8a9e958df52cb830`, implementation head `115e0c9039bae729708becbd5957f562cd5ff945` is exactly one commit ahead and zero behind.

Implementation adds only:

1. `src/lib/builder/templates/ritual-house.ts`
2. `tests/storefront-ritual-house-template.test.tsx`
3. `public/storefront-demo/ritual-house/atmosphere.svg`
4. `public/storefront-demo/ritual-house/evening.svg`
5. `public/storefront-demo/ritual-house/ritual.svg`

No SQL/customer-baseline or existing commerce-authority file is modified.

## Implementation CI evidence

Implementation head:

`115e0c9039bae729708becbd5957f562cd5ff945`

GitHub CI #2023 / Actions run `34253786878`: **SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1341 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because no baseline migration is introduced.

Implementation release manifest:

- version: `v24`
- SHA: `115e0c9039bae729708becbd5957f562cd5ff945`
- ref: `feature/storefront-ritual-house-wave13`
- environment: `ci`
- release hash: `d76aa20c38adc2d25a99b49f8ede9bf2cd477aa2ac1c16ccff542ed058696317`

The production build emitted only the already-known non-blocking Supabase Edge-runtime and autoprefixer warnings.

## Explicit non-scope

Wave 13 does not implement:

- medical diagnosis;
- aromatherapy treatment claims;
- sleep/anxiety/stress/pain outcome promises;
- black-box wellness scoring;
- a second product-discovery engine;
- a second specification registry;
- template-owned bundle pricing/inventory;
- new persistence authority;
- actual Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- production deploy;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 13 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Derma Studio / PR #135 and verified mergeable.
