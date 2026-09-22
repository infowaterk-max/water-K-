# Storefront Implementation Wave 2 — Structured Data / Golden #2 Tech Deck

## Purpose

Wave 2 implements **E7 — Compare & Spec Engine v1** as a shared structured product specification layer and consumes it in **Golden #2 Tech Deck**.

The implementation is stacked on Wave 1 and remains presentation/read-model focused. It does not add a separate tech-only attribute system, a database migration, merchant admin persistence UI, a live storefront route switch, or production/shared-staging mutation.

## Dependency chain

Wave 2 starts from Wave 1 final head:

`2e5a05f8973cd11cfa106e4805175df9c774366c`

Ordered dependency chain:

1. PR #115 — B2B Account Ownership — Draft; manual authenticated B2B acceptance remains the release blocker.
2. PR #117 — Storefront Runtime Wave 0 — Draft/unmerged.
3. PR #122 — Golden #1 Monarche / Core Commerce — Draft, based on Wave 0.
4. Wave 2 — Golden #2 Tech Deck / E7 — must remain stacked on Wave 1 until the lower layers land.

## E7 — Compare & Spec Engine v1

Engine version:

`shoporation.compare-spec-engine.v1`

E7 uses one shared `StructuredProductSpecificationRegistry` for product information, comparison and catalog facets.

It deliberately does **not** create a second technology-only attribute model.

### Typed values

Supported value types:

- text
- number
- boolean
- enum
- multi-value
- measurement
- range
- date

### Scope

Each specification declares one of:

- `product`
- `variant`
- `both`

Variant values override product values only when the definition permits it. Product-only and variant-only contracts remain distinct.

### Registry validation

The registry fails closed on:

- invalid group/spec keys;
- duplicate groups;
- duplicate specification definitions;
- missing groups;
- unit families on incompatible value types;
- invalid/empty enum option contracts.

### Unit normalization

Comparable measurements normalize through explicit unit families:

- length: mm / cm / m
- mass: g / kg
- storage: MB / GB / TB
- frequency: Hz / kHz / MHz / GHz
- power: W / kW
- capacity: mAh / Ah

This prevents semantically identical values such as `1 kg` and `1000 g` from appearing as false differences.

### Missing-data semantics

Missing specification values remain explicit:

- visual display: `—`
- semantic/accessibility label: `Nincs megadva`

Missing values are not silently fabricated or removed from comparison evidence.

### Shared read models

The same registry produces:

- key-spec groups;
- full specification groups;
- product comparison groups/rows/cells;
- difference-only comparison rows;
- structured catalog/search facets;
- normalized technical-document lists.

### Documents

Supported document types:

- datasheet / adatlap
- manual / használati útmutató
- certificate / tanúsítvány
- technical drawing / műszaki rajz
- warranty / garancia

Document normalization deduplicates identities and rejects unsafe URLs; only relative storefront paths or HTTPS destinations are accepted.

## Reusable storefront components

Wave 2 adds registry-driven components on top of the Wave 0/1 component stack:

- `commerce.option-selector`
- `commerce.key-specs`
- `commerce.specification-groups`
- `commerce.compare-button`
- `commerce.compare-tray`
- `commerce.compare-table`
- `commerce.technical-documents`
- `commerce.catalog-facets`
- `commerce.compare-spotlight`
- `commerce.product-launch-hero`

The renderer registry remains component-key + version driven. No `tech.tech-deck` template-name branch is introduced into the shared runtime.

## Golden #2 Tech Deck

Template identity:

- template key: `tech.tech-deck`
- version: `1`
- minimum plan: `alap`
- demo namespace: `tech-tech-deck`

### Visual DNA

Tech Deck is intentionally **clean consumer electronics decision commerce**:

- bright white background;
- cool soft-gray surfaces;
- graphite text;
- restrained cool-blue accent;
- clean sans-serif typography;
- product-first imagery;
- generous, precise whitespace;
- quiet rounded commerce chrome.

Explicitly excluded directions:

- gamer/RGB aesthetic;
- industrial dashboard aesthetic;
- dark Spec Lab aesthetic.

## Approved Home composition

The Page Schema metadata locks this order:

1. Product Launch Hero
2. Shop by Category
3. Featured Technology
4. Best Sellers
5. Compare Spotlight
6. Use Case Navigation
7. Feature Story
8. Recommendations
9. Buying Guides
10. Footer

## Page package

Tech Deck ships 14 declared Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content — used as the structured product-comparison presentation role
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

The compare page remains the single `content` page-type preset and is identified with `metadata.contentRole = product-compare`, preserving the one-preset-per-declared-page-type installation contract.

## Catalog and search

Catalog/search pages consume E7 facets from the shared specification registry.

Desktop catalog layout:

- facets: 3/12
- product results: 9/12

Tablet:

- facets: 4/12
- product results: 8/12

Mobile:

- both reflow to 12/12

E2 remains the Product Discovery binding boundary; Wave 2 does not replace the Product Discovery engine.

## Product page

Desktop/tablet decision layout:

- media/gallery: 7/12
- purchase/key-spec column: 5/12

Mobile:

- both reflow to 12/12

The purchase column includes:

- product information;
- reusable color swatches;
- generic option selector (for example storage);
- E7 key specs;
- compare action;
- purchase CTA binding surface.

Below the buybox:

- grouped technical specifications;
- technical documents;
- recommendations.

Unavailable option values remain visible and disabled. Unsafe option URLs are rejected by shared URL guards.

## Compare surface

The compare surface consumes E7 comparison groups generated from the same specification registry.

It supports:

- multiple compared products;
- grouped rows;
- explicit missing cells;
- normalized measurement equality;
- highlighted differences;
- difference-only read models.

## Engine boundaries

Tech Deck declares:

- E1 Runtime — implemented by Wave 0 and consumed here;
- E2 Product Discovery — binding contract only;
- E7 Compare & Spec Engine v1 — implemented in Wave 2;
- E13 Checkout — binding contract only.

Wave 2 does not embed payment-provider behavior. Checkout remains provider neutral; there is no K&H/vPOS credential, merchant identifier or payment secret in Tech Deck Page Schema.

## Persistence decision

Wave 2 deliberately does not introduce a new database/admin persistence model for structured specifications.

E7 is implemented as a shared typed registry/read-model and storefront binding contract over existing product/variant semantics. Persistence/admin authoring may be connected later through the common platform contracts without changing the storefront component model.

## Mutation boundary

Wave 2 inherits Wave 0D template-installation safety:

- storefront Page Schema drafts: allowed
- products: no direct mutation
- variants: no direct mutation
- customers: no direct mutation
- orders: no direct mutation
- B2B: no direct mutation

The Wave 2 implementation diff adds only E7/Tech Deck source, tests and deterministic local demo SVGs. It contains no SQL migration and no `supabase/customer-baseline/` edit.

## Regression coverage

Wave 2 adds coverage for:

- registry validation/fail-closed behavior;
- product/variant/both scope resolution;
- unit normalization;
- semantic comparison equality;
- grouped key specs;
- explicit missing-data evidence;
- shared facets from the same registry;
- difference-only compare rows;
- technical-document URL safety and canonical labels;
- Tech Deck visual/engine identity;
- Alap Template Capability Gate compatibility;
- all 14 Tech Deck page presets;
- approved Home ordering;
- Home runtime rendering;
- 7/12 + 5/12 desktop product layout and 12/12 mobile reflow;
- sold-out option visibility/disabled state;
- unsafe variant URL rejection;
- E7 spec/document rendering;
- E7 compare-table rendering;
- draft-only template installation;
- demo namespace separation;
- provider-neutral checkout.

## CI evidence

Pre-documentation implementation head:

`2a2a3db6dd284fdf8dd0fd46fe83c8cd331ab96b`

GitHub CI #1869 / Actions run `34207466818`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — 192 files / 1255 tests
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 2 introduces no baseline migration

The documentation commit must also pass the complete branch CI before Wave 2 is considered documentation-complete.

## Explicit non-scope

- no Supabase/customer-baseline migration;
- no structured-spec admin authoring UI;
- no new product persistence authority;
- no live storefront route switch;
- no Visual Builder drag/drop UI;
- no E2 Product Discovery replacement;
- no E13 checkout replacement;
- no payment/K&H/vPOS changes;
- no production/shared-staging mutation;
- no production Vercel deployment;
- no Water-K tenant status change.

## Release discipline

Wave 2 must remain a stacked Draft PR on Wave 1 / PR #122. It must not bypass Wave 1, Wave 0 or PR #115 in the release chain.

A green Wave 2 CI authorizes only code-level acceptance of this block, not production rollout.
