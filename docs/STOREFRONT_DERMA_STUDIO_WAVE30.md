# Storefront Scale-out Wave 30 — Derma Studio Re-acceptance & Builder Hardening

## Scope

Wave 30 re-accepts and hardens the inherited `beauty.derma-studio` v1 template on the current production baseline. It does **not** create a second Derma Studio template and does not introduce a medical, diagnostic, routine, product-attribute, pricing, inventory or checkout authority engine.

Branch:

`feature/storefront-derma-studio-wave30`

Exact production base:

`676a3216caf92281f663a94b1b138d0ed28d9e8b`

This is the current production `main` baseline after the Storefront-through-Wave-29 release checkpoint and the later merged Communication Hub 2.0 work.

Historical Derma Studio implementation already existed as Wave 12 on `feature/storefront-derma-studio-wave12`; Wave 30 therefore modifies the canonical inherited v1 only where the current Builder contract requires hardening.

Accepted implementation head before this documentation commit:

`9fcb4d7d4a5dacf688f2020b51d4b7e7b425ebbc`

## Beauty & Wellness family separation

The three directions remain intentionally different.

### Beauty Lab

Journey:

`formula → ingredient → texture → guided choice → product`

Owns the contemporary beauty concept-store / formula-lab direction.

### Derma Studio

Journey:

`concern → routine → active ingredient → product`

Owns clinically clean, concern-first and routine-first skincare commerce with deterministic, explainable merchandising guidance.

### Ritual House

Journey:

`mood → ritual → format → scent or ingredient → product`

Owns the warm-dark, sensory, cocooning home-wellness / beauty ritual direction.

Derma Studio must not become either a Beauty Lab recolor or a dark Ritual House variant.

## Visual direction

Derma Studio remains clinically clean without becoming a medical-clinic interface.

Accepted visual character:

- warm-white background;
- soft mineral-grey surfaces;
- graphite text;
- muted blue-green primary/accent family;
- soft clay secondary accent;
- clean editorial sans display typography;
- precise sans interface typography;
- clean product macro photography;
- ingredient, glass, texture and routine imagery;
- precise, airy, educational spacing.

Builder font requirements:

- actually Builder-available;
- legally usable;
- Hungarian-character support.

Merchant accent remains tokenized through `--merchant-accent`.

Explicit exclusions remain:

- medical-clinic UI;
- diagnostic UI;
- treatment/cure claims;
- black-box score;
- fabricated clinical evidence;
- medical before/after claims.

## Engine contract

Required shared engines remain:

- E1 Runtime / Page Schema
- E2 Product Discovery authority
- E3 Guided Finder v1
- E7 structured product / ingredient / routine-step attributes
- E13 Checkout

No new Derma-specific engine is introduced.

Authority rule remains:

`routine-and-concern-guidance-is-non-diagnostic-and-read-model-only`

### E3 boundary

E3 provides deterministic, explainable merchandising/navigation guidance. It may map user-selected concerns/preferences to registered product attributes and expose matched/mismatched evidence.

It is not:

- diagnosis;
- medical triage;
- treatment advice;
- a health-record system;
- disease inference;
- routine mutation authority;
- product eligibility authority outside the shared E2 discovery contract.

### E7 boundary

E7 may expose supplied structured facts such as:

- routine step;
- texture;
- active ingredient identity;
- ingredient concentration when genuinely present in product data;
- other registered product/specification attributes.

Derma Studio must not infer missing ingredient concentrations, material facts, efficacy evidence or clinical proof.

## Wave 30 Builder hardening

The historical Derma Studio Home used one `editorial.hero` node. Although that node had bindings, the current Builder contract requires the important marketing layers to remain independently editable and positionable.

Wave 30 therefore reuses the existing shared visual primitives:

- `visual.layered-canvas`
- `visual.layer`

and composes them with the existing E3 Guided Finder registry through two shared composition helpers:

- `createStorefrontGuidedVisualComponentRegistry()`
- `createStorefrontGuidedVisualRendererRegistry()`

This is registry composition only. It creates no new guidance or commerce authority.

### Independent Clinical Clarity Hero layers

The canonical Derma Studio Home hero now has eight separate layers:

1. image
2. overlay
3. decoration
4. badge
5. title
6. copy
7. primary CTA
8. secondary CTA

Relevant Builder bindings remain independent, including:

- `content.clarityHero.image`
- `content.clarityHero.imageAlt`
- `content.clarityHero.decoration`
- `content.clarityHero.decorationAlt`
- `content.clarityHero.badge`
- `content.clarityHero.title`
- `content.clarityHero.copy`
- `content.clarityHero.primaryLabel`
- `content.clarityHero.primaryHref`
- `content.clarityHero.secondaryLabel`
- `content.clarityHero.secondaryHref`

Marketing copy, price, clinical evidence and CTA text must never be baked into image assets.

The deterministic decoration added by Wave 30 is an abstract SVG only and contains no business copy or medical claim:

`public/storefront-demo/derma-studio/decor.svg`

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Responsive contract remains Desktop / Tablet / Mobile.

## Home composition

Exact accepted Home order remains unchanged:

1. Clinical Clarity Hero
2. Shop by Concern
3. Routine Finder
4. Active Ingredient Index
5. Routine Steps
6. Targeted Formulas
7. Ingredient Education
8. Reviews
9. Footer

The Builder hardening changes hero composition, not the accepted merchandising journey.

## Product authority

Commerce truth remains outside the template:

- price = pricing binding only;
- stock = inventory binding only;
- variants = variant binding only;
- reviews = review binding only;
- structured product/ingredient facts = E7 or authoritative product bindings only when supplied;
- checkout = shared provider-neutral E13.

Wave 30 explicitly rejects:

- fake ingredient concentrations;
- fake clinical evidence;
- fake efficacy claims;
- template-specific medical authority.

## Product page

The accepted PDP structure remains unchanged.

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- gallery: 12/12
- buybox: 12/12

The PDP keeps:

- authoritative product information;
- `Skin Goal Snapshot` from E7-compatible structured facts;
- active ingredient/specification groups;
- E3 matched/mismatched explanation evidence;
- provider-independent purchase binding;
- shared recommendations.

## Page package

Derma Studio continues to provide all 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Routine Guide
9. Blog Index / Skin Notes
10. Blog Article / Skin Note
11. FAQ
12. Contact
13. Legal
14. Not Found

Demo namespace remains:

`beauty-derma-studio`

Installation remains draft-only and cannot mutate:

- products;
- variants;
- customers;
- orders;
- B2B authority.

## Checkout

Checkout remains E13-bound and provider-neutral.

No K&H/vPOS credential, merchant identifier or payment secret is introduced by this wave.

## Wave 30 implementation files

Compared with exact production base `676a3216caf92281f663a94b1b138d0ed28d9e8b`, accepted implementation head `9fcb4d7d4a5dacf688f2020b51d4b7e7b425ebbc` is:

- 8 commits ahead;
- 0 behind;
- 8 changed files;
- 260 additions;
- 6 deletions.

Changed files:

1. `public/storefront-demo/derma-studio/decor.svg`
2. `src/components/builder/storefront-guided-visual.tsx`
3. `src/components/builder/storefront-visual-layers.tsx`
4. `src/lib/builder/storefront-guided-visual.ts`
5. `src/lib/builder/templates/derma-studio-wave30-acceptance.ts`
6. `src/lib/builder/templates/derma-studio.ts`
7. `tests/storefront-derma-studio-template.test.tsx`
8. `tests/storefront-derma-studio-wave30-reacceptance.test.tsx`

No SQL/customer-baseline, production database, payment or deployment configuration file is changed.

## Accepted implementation CI

Implementation head:

`9fcb4d7d4a5dacf688f2020b51d4b7e7b425ebbc`

GitHub **CI #2199 / Actions run `34457588240`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **218 unique test files / 1539 tests PASS**;
- 438 / 438 test suites PASS;
- 1539 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 30 introduces no database migration.

Implementation release manifest:

- version: `v24`;
- SHA: `9fcb4d7d4a5dacf688f2020b51d4b7e7b425ebbc`;
- ref: `feature/storefront-derma-studio-wave30`;
- environment: `ci`;
- release hash: `a3eaaff3debb2d6585de53e5fb5f94537ee47f8a34e2eebe34fab636cd39fd82`.

## Explicit no-deploy rule

Wave 30 does not trigger or authorize:

- Vercel production deployment/promotion;
- Supabase staging/production mutation;
- SQL migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K `pilot` status change.

Any automatic branch Preview created by the repository's Vercel Git integration is not production deployment authorization.

## Closure rule

Wave 30 closes only when:

1. this documentation HEAD passes a fresh full current-head GitHub CI;
2. final test totals and final release hash are independently recorded from artifacts;
3. final diff is verified against exact production base `676a3216caf92281f663a94b1b138d0ed28d9e8b`;
4. a Draft PR targets current `main`;
5. the PR is open, not merged and mergeable/clean;
6. production remains unchanged and Water-K remains `pilot`.
