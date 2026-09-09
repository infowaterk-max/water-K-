# Storefront Scale-out Wave 12 — Derma Studio

## Purpose

Wave 12 implements the next genuinely missing Beauty & Wellness scale-out template after Statement Lab.

Beauty Lab is deliberately not duplicated: it was already completed earlier as Golden #5 and represents a formula/ingredient-first beauty concept-store direction. Derma Studio is a distinct concern-first, routine-first skincare commerce direction.

Template key:

`beauty.derma-studio`

Base:

`feature/storefront-statement-lab-wave11`

Base final head:

`5e5e8415b4c90e5e72d4355fb51ff3ae12d14ccc`

Implementation head:

`631bc8bc9798388346e9a080abd38663ecf8739f`

Wave 12 is a stacked Draft implementation. It introduces no SQL migration, live storefront route switch, staging/production mutation, payment change or Water-K status change.

## Distinct positioning

Beauty Lab and Derma Studio intentionally share common storefront engines but not the same shopping journey.

Beauty Lab:

`formula → ingredient → texture → guided choice → product`

Derma Studio:

`concern → routine → active ingredient → product`

Derma Studio therefore starts from a customer-described skincare goal/concern and progressively narrows toward routine step, structured active-ingredient evidence and product choice.

This is a commerce-navigation model only. It is not diagnosis, medical triage, treatment advice or a clinical decision system.

## Visual direction

Derma Studio is clinically clean without becoming a medical-clinic interface.

Visual character:

- warm-white background;
- soft mineral-grey surfaces;
- graphite text;
- muted blue-green primary accent;
- soft clay secondary accent;
- clean editorial sans display typography;
- precise sans interface typography;
- clean product macro photography;
- glass, texture, ingredient and routine imagery;
- precise, airy, educational spacing.

Explicit exclusions:

- medical-clinic UI;
- diagnostic UI;
- treatment or cure claims;
- black-box recommendation scores;
- fabricated clinical evidence;
- medical before/after claims.

The deterministic demo media contains only abstract product/routine/ingredient compositions and no embedded marketing copy or medical evidence.

## Engine contract

Derma Studio requires the already shared storefront engines:

- E1 Runtime
- E2 Product Discovery
- E3 Guided Finder v1
- E7 Compare & Spec / structured product data
- E13 Checkout

No Derma Studio-specific recommendation, medical, routine, product-attribute, pricing, inventory or checkout authority is introduced.

Integration rule:

- E1 provides the common Page Schema runtime;
- E2 remains catalog/search/channel discovery authority;
- E3 provides deterministic, explainable concern/routine guided selling;
- E7 supplies structured active-ingredient, routine-step and other product attributes/specification evidence;
- E13 remains final checkout authority.

Authority rule:

`routine-and-concern-guidance-is-non-diagnostic-and-read-model-only`

## Guided Finder safety

Derma Studio consumes the existing E3 Guided Finder contract instead of building a second skincare recommender.

The Finder:

- uses ordered questions/options;
- maps answers to structured product-attribute rules;
- remains deterministic and explainable;
- surfaces matched/mismatched evidence;
- does not create a black-box score;
- does not diagnose a condition;
- does not recommend medical treatment;
- does not convert a concern label into disease or clinical evidence.

A customer-facing concern such as dry feel or balance preference is a merchandising/navigation signal only.

## Structured product evidence

E7 remains the source for structured product-facing data such as:

- routine step;
- texture;
- active ingredient identity;
- ingredient concentration when genuinely supplied by product data;
- other registered product/specification attributes.

The template does not infer missing active ingredients or concentrations and does not fabricate efficacy evidence.

## Home composition

Exact accepted Home order:

1. Clinical Clarity Hero
2. Shop by Concern
3. Routine Finder
4. Active Ingredient Index
5. Routine Steps
6. Targeted Formulas
7. Ingredient Education
8. Reviews
9. Footer

### Clinical Clarity Hero

Positions the shopping journey around understandable goals, routines and active-ingredient evidence without diagnostic language.

### Shop by Concern

Uses the common collection-navigation surface. Concern navigation is merchandising taxonomy, not medical classification.

### Routine Finder

Uses `guided.finder` from E3. Results must remain explainable through structured product attributes.

### Active Ingredient Index

Uses the shared `guided.attribute-index` surface over structured catalog data.

### Routine Steps

Uses a common editorial split-feature. This block is educational presentation only; it does not create a separate routine engine or silently mutate cart/product choices.

### Targeted Formulas

Uses the shared product grid and existing catalog authority.

### Ingredient Education

Editorial explanation can link to products/structured attributes but cannot introduce diagnosis, treatment/cure promises or fabricated clinical proof.

### Reviews

Uses the common review-summary read surface and does not create review authority.

## Catalog and search

Catalog and search remain E2 discovery surfaces enriched by E7 structured attributes and common E3 attribute-navigation presentation.

Supported navigation dimensions can include:

- skincare goal/concern;
- routine step;
- active ingredient;
- other registered safe product attributes.

No separate Derma Studio catalog eligibility authority is created.

## Product page

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- both reflow to 12/12

Buybox includes:

- common product information;
- `Skin Goal Snapshot` via E7 key specs;
- purchase CTA.

Below the buybox:

- grouped `Aktív összetevők és tulajdonságok` via E7 specification groups;
- E3 explanation surface `Miért került ebbe az útvonalba?`;
- related product/recommendation row through the shared recommendation surface.

Finder evidence can explain why a product matched or differed from selected merchandising preferences. It cannot claim that the product treats, cures or medically resolves a condition.

## Routine Guide content surface

The Content preset has:

`contentRole = routine-guide`

and:

`engineBinding = E3+E7`

It presents the navigation model:

`concern → routine step → active ingredient`

The surface remains educational/navigation-oriented and does not become a health-record, diagnostic or treatment system.

## Page package

Derma Studio ships 14 Page Schema presets:

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

Minimum plan:

`alap`

Demo namespace:

`beauty-derma-studio`

## Checkout

Checkout is E13-bound and provider-neutral.

The Page Schema contains no K&H/vPOS credential, merchant identifier or payment secret.

## Demo content

Namespaced fixtures:

- collection `skin-goals`
- product `barrier-serum`
- product `daily-fluid`
- content `active-index`

Deterministic local demo media:

- `public/storefront-demo/derma-studio/clarity.svg`
- `public/storefront-demo/derma-studio/routine.svg`
- `public/storefront-demo/derma-studio/active.svg`

Regression coverage explicitly rejects diagnostic/treatment/cure-style demo claims.

## Template-install safety

Installation remains draft-only under the established Wave 0D mutation boundary:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

Finder configuration, product attributes and commerce authorities remain outside template-switch mutation authority.

No database migration is introduced.

## Regression coverage

Wave 12 verifies:

- exact `beauty.derma-studio` key/version;
- distinct concern-first/routine-first visual and journey contract;
- medical/diagnostic/treatment/cure/black-box exclusions;
- E1/E2/E3/E7/E13 engine contract;
- 14 Alap-compatible Page Schema presets;
- full Page Document validation through the existing Guided Finder + structured-product registry;
- exact Home sequence;
- concern navigation;
- explainable Routine Finder;
- Active Ingredient Index;
- targeted product rendering;
- PDP 7/12 + 5/12 desktop/tablet layout;
- 12/12 mobile reflow;
- `Skin Goal Snapshot`;
- grouped active-ingredient/specification evidence;
- E3 matched/mismatched explanation evidence;
- draft-only namespaced template installation;
- non-diagnostic demo fixtures;
- provider-neutral E13 checkout.

## Implementation diff

Compared with Statement Lab final head `5e5e8415b4c90e5e72d4355fb51ff3ae12d14ccc`, Derma Studio implementation head `631bc8bc9798388346e9a080abd38663ecf8739f` is exactly one commit ahead, zero commits behind, and adds 5 files with zero deletions:

1. `src/lib/builder/templates/derma-studio.ts`
2. `tests/storefront-derma-studio-template.test.tsx`
3. `public/storefront-demo/derma-studio/clarity.svg`
4. `public/storefront-demo/derma-studio/routine.svg`
5. `public/storefront-demo/derma-studio/active.svg`

No SQL/customer-baseline or pre-existing commerce-authority file is modified.

## Implementation CI evidence

Implementation head:

`631bc8bc9798388346e9a080abd38663ecf8739f`

GitHub CI #2020 / Actions run `34252518418`: **SUCCESS**.

Verified:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **200 test files / 1340 tests**
- TypeScript: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 12 introduces no baseline migration

Implementation release manifest:

- version: `v24`
- SHA: `631bc8bc9798388346e9a080abd38663ecf8739f`
- ref: `feature/storefront-derma-studio-wave12`
- environment: `ci`
- release hash: `6c0d7ce726ec051e3012fe616b0309d08d3c201aefba6ff2fb62c364d467689a`

The production build emitted only the already-known non-blocking Supabase Edge-runtime and autoprefixer warnings.

## Explicit non-scope

Wave 12 does not implement:

- medical diagnosis or triage;
- disease classification;
- treatment/cure recommendations;
- clinical claim authority;
- before/after medical evidence;
- black-box ML skincare scoring;
- a second Guided Finder engine;
- a second product-attribute/specification registry;
- new routine persistence authority;
- product/pricing/inventory/order authority;
- actual Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- production deployment;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 12 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Statement Lab / PR #133 and verified mergeable.
