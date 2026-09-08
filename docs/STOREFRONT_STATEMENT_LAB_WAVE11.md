# Storefront Scale-out Wave 11 — Statement Lab

## Purpose

Wave 11 implements the next genuinely missing Jewelry & Accessories scale-out template after Modern Luxe.

The previously recorded family order included Heritage Atelier between Modern Luxe and Statement Lab. Heritage Atelier was already fully implemented earlier as Golden #3, so Wave 11 deliberately does not duplicate that template and proceeds with Statement Lab.

Template key:

`jewelry.statement-lab`

Base:

`feature/storefront-modern-luxe-wave10`

Base final head:

`7d5908d5aae4467b5b3194137461ab7755d07599`

Implementation head:

`19392d57c72f220fc7d471a8928029d3ccbd1511`

Wave 11 is a stacked Draft implementation. It introduces no SQL migration, live storefront route switch, staging/production mutation, payment change or Water-K status change.

## Accepted direction

Statement Lab is a contemporary design-jewelry store × gallery × material lab.

Visual character:

- off-white gallery background;
- silver-grey surfaces;
- graphite typography;
- one restrained merchant accent only;
- supported accent directions: oxidized red, acid yellow or cobalt;
- grotesk display typography;
- clean sans interface typography;
- optional monospaced specification accent;
- large object photography;
- macro material studies;
- asymmetric, precise gallery-like spacing.

Explicit exclusions:

- Heritage Atelier-style heritage luxury;
- Modern Luxe champagne-gold luxe language;
- streetwear/graffiti language;
- dark gamer-tech language;
- multiple competing accent colors;
- fabricated material or manufacturing claims.

Default deterministic visual tokens use off-white, graphite, silver-grey and oxidized red, with the accent remaining merchant-replaceable.

## Engine contract

Statement Lab requires the already shared storefront engines:

- E1 Runtime
- E2 Product Discovery
- E7 Compare & Spec Engine v1
- E13 Checkout

No Statement Lab-specific product, material, pricing, inventory or comparison authority is introduced.

Integration rule:

- E1 provides Page Schema runtime and the shared visual-layer primitives;
- E2 remains product discovery/search authority;
- E7 provides structured product/material specifications and comparison read models;
- E13 remains final checkout authority.

`Object Specification` and `Form Compare` are read-model/presentation surfaces only.

## Shared runtime reuse

Wave 11 intentionally reuses rather than duplicates:

- `visual.layered-canvas`
- `visual.layer`
- `commerce.key-specs`
- `commerce.specification-groups`
- `commerce.compare-button`
- `commerce.compare-table`
- `commerce.technical-documents`
- `commerce.catalog-facets`
- `commerce.compare-spotlight`
- shared product grid/product information/gallery/option-selector/cart/checkout components.

There is no `jewelry.statement-lab` conditional renderer branch.

## Home composition

Exact accepted Home order:

1. Asymmetric Opening
2. Floating Product Index
3. Material Study
4. Statement Grid
5. Object Detail
6. Footer

### Asymmetric Opening

The opening reuses the shared layered visual runtime and represents the composition as separate Page Schema layers:

- object image;
- object/index label;
- display title;
- supporting copy.

This keeps the composition Builder-ready while preserving the gallery-like asymmetry.

### Floating Product Index

Uses the common product-grid commerce surface with merchant/product bindings.

### Material Study

Uses E7 `commerce.key-specs` read models. Material, weight, dimensions, finish and related facts must come from structured product/material evidence rather than template-authored claims.

### Statement Grid

Uses the shared product-grid surface; no separate catalog authority is created.

### Object Detail

Uses the shared E7 comparison spotlight surface for concise object/form/material comparison.

## Catalog and search

Catalog/search remain E2 discovery surfaces with E7 structured facets.

Desktop:

- facets: 3/12
- results: 9/12

Tablet:

- facets: 4/12
- results: 8/12

Mobile:

- facets: 12/12
- results: 12/12

The template can expose material/form/specification facets without creating a new filtering authority.

## Product page

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- both: 12/12

Buybox includes:

- common product information;
- generic variant/option selector;
- E7 key specifications labelled `Object Specification`;
- E7 compare action labelled `Form Compare`;
- purchase CTA.

Below the buybox:

- full grouped `Object Specification` via E7 specification groups;
- `Form Compare` via the E7 comparison table;
- technical/material/care documents through the shared document surface.

Representative structured values supported by the contract include:

- material;
- weight;
- width/dimensions;
- finish;
- manufacturing/making information.

These values are display/read-model data. The template does not author or infer material truth.

Unsafe option URLs remain rejected by the shared runtime and unavailable variants remain visible but disabled.

## Form Compare content surface

The Content preset has:

`contentRole = form-compare`

and consumes the shared E7 compare-table read model.

Comparison therefore stays normalized and structured rather than becoming a bespoke jewelry comparison engine.

## Page package

Statement Lab ships 14 Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Form Compare
9. Blog Index / Studies
10. Blog Article / Study
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan:

`alap`

Demo namespace:

`jewelry-statement-lab`

## Checkout

Checkout is E13-bound and provider-neutral.

The Page Schema contains no K&H/vPOS credential, merchant identifier or payment secret.

## Demo content

Namespaced fixtures:

- collection `objects`
- product `form-ring-01`
- product `line-watch-02`
- content `material-study`

Deterministic local demo media:

- `public/storefront-demo/statement-lab/opening.svg`
- `public/storefront-demo/statement-lab/material.svg`
- `public/storefront-demo/statement-lab/object.svg`

The demo media contains abstract object/material compositions only, with no baked editable marketing copy and no commercial authority.

## Template-install safety

Installation remains draft-only under the established Wave 0D mutation boundary:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

No database migration is introduced.

## Regression coverage

Wave 11 verifies:

- exact Statement Lab key/version;
- contemporary gallery/material-lab visual DNA;
- one-accent model and accepted accent options;
- exclusion of heritage/champagne-gold/dark-gamer/multi-accent directions;
- E1/E2/E7/E13 engine contract;
- 14 Alap-compatible Page Schema presets;
- full Page Document validation using the shared visual-layer + structured-product registry;
- exact Home sequence;
- asymmetric layered opening;
- E7 Material Study rendering from bindings;
- Floating Product Index / Object Detail rendering;
- product page 7/12 + 5/12 desktop/tablet layout;
- 12/12 mobile reflow;
- Object Specification rendering;
- Form Compare rendering;
- structured material/weight/dimension/finish/manufacturing values;
- generic option selection;
- unavailable option disabled state;
- unsafe option URL rejection;
- draft-only namespaced installation;
- provider-neutral E13 checkout.

## Implementation diff

Compared with Modern Luxe final head `7d5908d5aae4467b5b3194137461ab7755d07599`, Statement Lab implementation head `19392d57c72f220fc7d471a8928029d3ccbd1511` is exactly one commit ahead, zero commits behind, and adds 5 files with zero deletions:

1. `src/lib/builder/templates/statement-lab.ts`
2. `tests/storefront-statement-lab-template.test.tsx`
3. `public/storefront-demo/statement-lab/opening.svg`
4. `public/storefront-demo/statement-lab/material.svg`
5. `public/storefront-demo/statement-lab/object.svg`

No SQL/customer-baseline or pre-existing commerce-authority file is modified.

## Implementation CI evidence

Implementation head:

`19392d57c72f220fc7d471a8928029d3ccbd1511`

GitHub CI #2015 / Actions run `34251026440`: **SUCCESS**.

Verified:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **200 test files / 1339 tests**
- TypeScript: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 11 introduces no baseline migration

Implementation release manifest:

- version: `v24`
- SHA: `19392d57c72f220fc7d471a8928029d3ccbd1511`
- ref: `feature/storefront-statement-lab-wave11`
- environment: `ci`
- release hash: `01c20f663af141bfd5ebcbb6b8c3d5159f5a23017a5e487c8db2a79a6e5d99b8`

The production build emitted only the already-known non-blocking Supabase Edge-runtime/autoprefixer warnings.

## Explicit non-scope

Wave 11 does not implement:

- a new material/specification database authority;
- a second comparison engine;
- jewelry-specific pricing or inventory authority;
- arbitrary Builder CSS positioning;
- actual Visual Builder drag/drop UI;
- live storefront route switch;
- SQL/customer-baseline migration;
- staging/production mutation;
- production deployment;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 11 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Modern Luxe / PR #132 and verified mergeable.
