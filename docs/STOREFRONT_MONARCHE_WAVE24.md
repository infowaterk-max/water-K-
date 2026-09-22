# Storefront Scale-out Wave 24 — Golden #1 Monarche

## Scope

Wave 24 is the **scale-out hardening and re-acceptance pass** for the already inherited Golden #1 Monarche template.

It does **not** create a second Monarche implementation and does not introduce a new fashion-specific engine.

- Template key: `fashion.monarche`
- Template version: `1`
- Category: Divat & Ruházat
- Position: balanced modern premium mainstream
- Branch: `feature/storefront-monarche-wave24`
- Base branch: `feature/storefront-performance-lab-wave23`
- Exact base head: `af75b116b386432175b0b00b08fc74144bde5ac5`
- Accepted implementation head: `a521f320ed2054a5de292b3c2fed35dca6dd64f6`

Historical Golden #1 implementation remains preserved in PR #122 / `feature/storefront-monarche-wave1`. Wave 24 evaluates and hardens the version inherited into the current stacked template chain.

## Accepted visual direction

Monarche remains the balanced modern premium fashion direction:

- modern editorial luxury commerce;
- warm off-white background;
- black / graphite typography and chrome;
- soft stone secondary surfaces;
- merchant-replaceable accent;
- generous whitespace;
- editorial fashion photography;
- elegant serif/display typography with clean sans UI;
- quiet image-led product cards;
- restrained rectangular premium buttons;
- 4:5 collection and product imagery.

Explicit portfolio exclusions:

- not Editorial Atelier's asymmetric magazine composition;
- not Street Drop's drop-culture / streetwear treatment;
- not a discount-megastore density pattern;
- no baked-in hero/banner text;
- no fabricated price, stock, rating or product claim.

## Protected header contract

Approved primary navigation fallback:

`LOGO | Újdonságok | Női | Férfi | Kollekciók | Journal`

Fallback destinations are merchant-safe navigation routes and remain replaceable through the shared `navigation.primary` binding.

The previously approved utility intent is:

- Keresés
- Fiók
- Kedvencek

The current shared `system.header` primitive only permits a `system.navigation` child. Wave 24 therefore does **not** add template-specific utility children or a Monarche-only header renderer.

Boundary:

`shared-header-extension-required-no-template-specific-child-hack`

Search/account/favourites utility rendering must be added through a future common Header primitive extension so all templates can consume the same protected-system contract.

## Exact Home order

1. Editorial Hero
2. Collection Navigation
3. New Arrivals
4. Editorial Split Feature
5. Product Story Grid
6. Featured Collection
7. Social Proof/Reviews
8. Journal Preview
9. Newsletter
10. Footer

The sequence is unchanged from the approved Golden #1 composition.

## Builder layer contract

The scale-out acceptance explicitly preserves editable layers instead of baking copy into media.

Hero bindings:

- image
- eyebrow
- title
- copy
- primary label
- primary href
- secondary label
- secondary href

Editorial Split bindings:

- image
- eyebrow
- title
- copy
- CTA label
- CTA href

Responsive modes remain desktop, tablet and mobile through the common Page Schema / component runtime.

## Product page

Desktop/tablet:

- product gallery: 7/12
- buybox: 5/12

Mobile:

- gallery: 12/12
- buybox: 12/12

The generic attribute-based variant contract is retained. Sold-out values remain visible but disabled. Unsafe option URLs remain blocked by shared renderer rules.

## Authority defects corrected

The inherited Golden #1 implementation predated the stricter scale-out authority rules and contained two unacceptable presentation fallbacks.

### Review fallback

Old Home fallback:

- rating `4.9`
- count `0`

A template cannot imply a real review score without review authority. Wave 24 changes Home review fallback to:

- rating `0`
- count `0`

Actual review values can still render from `reviews.summary` when supplied.

### Demo prices

The historical demo fixtures contained hard-coded `priceLabel` values for demo products.

Wave 24 removes those price labels. Product fixtures now identify demo products only; real price, compare-at price, stock and other commerce facts must come from authoritative bindings.

### Editorial claim cleanup

Fallback marketing copy was also neutralized where wording could be interpreted as unsupported material or durability claims. The template may provide editorial structure and style, but it cannot manufacture product facts.

Global authority rule:

`monarche-presentation-never-invents-price-stock-rating-product-attribute-material-durability-or-order-authority`

## Engine contract

Required full experience:

`E1 + E2 + E10 + E13`

Optional:

`E7`

### E1 — Runtime / Page Schema

Owns the shared Page Schema, component contract, bindings and responsive runtime.

### E2 — Product Discovery

Owns catalog/search/product eligibility and actual product discovery data.

### E10 — Editorial / Story

Owns Journal/editorial/story context. Wave 24 recognizes this existing shared engine instead of treating editorial content as an unowned template-local concern.

### E13 — Checkout

Owns provider-neutral cart/checkout and final commerce flow.

### E7 — optional Structured Product

May supply additional structured product facts where the experience needs them. Monarche does not create a parallel fashion attribute engine.

## Page package

All 14 Alap-compatible Page Schema presets remain present:

Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Template hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Demo namespace remains:

`fashion-monarche`

Template installation remains draft-only and may not directly mutate products, variants, customers, orders or B2B data.

## Accepted implementation CI

Accepted implementation head:

`a521f320ed2054a5de292b3c2fed35dca6dd64f6`

GitHub **CI #2082 / Actions run `34339055799`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1351 tests PASS**;
- 1351 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 24 introduces no baseline migration.

Implementation release manifest:

- version: `v24`;
- SHA: `a521f320ed2054a5de292b3c2fed35dca6dd64f6`;
- ref: `feature/storefront-monarche-wave24`;
- environment: `ci`;
- release hash: `d3f8e643aba583b94b9b5eadbf310370109894207f2bd3ab3b45087facbcd385`.

## Implementation diff vs Performance Lab final head

Compared with `af75b116b386432175b0b00b08fc74144bde5ac5`:

- 2 commits ahead;
- 0 behind;
- 2 modified files;
- `src/lib/builder/templates/monarche.ts`;
- `tests/storefront-monarche-template.test.tsx`.

No SQL/customer-baseline file, shared runtime authority, payment integration or deployment configuration is changed by the implementation commit set.

## Explicit no-deploy rule

Wave 24 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K pilot status change.

GitHub `production build` is compilation/evidence only.

## Closure rule

Wave 24 closes only when:

1. this final documentation HEAD passes full current-head GitHub CI;
2. final test totals and final release hash are independently recorded;
3. final diff is verified against Performance Lab final head;
4. a Draft PR is stacked directly on `feature/storefront-performance-lab-wave23` / PR #146;
5. that PR is open, not merged and mergeable/clean.
