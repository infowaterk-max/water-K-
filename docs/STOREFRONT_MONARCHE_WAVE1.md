# Storefront Implementation Wave 1 — Golden #1 Monarche / Core Commerce

## Purpose

Wave 1 consumes the common Storefront Runtime / Builder Compatibility contracts from `storefront-runtime-wave0` and implements the first Golden Template package without introducing template-specific runtime branches.

Template identity:

- template key: `fashion.monarche`
- template version: `1`
- character: modern editorial luxury commerce
- minimum plan: `alap`

The branch remains presentation/runtime-consumer only. It does not switch a live storefront route, apply a database migration, modify production/shared staging, or change the Water-K tenant status.

## Dependency chain

Wave 1 is intentionally based on `storefront-runtime-wave0` commit `cd2b1031a9c4b4ffa2bb7b574a6e50a6066704b8` rather than `main`.

Release order remains:

1. PR #115 — Block 7 B2B Account Ownership: still Draft; Fresh Install proof is complete, but final manual authenticated B2B acceptance remains open.
2. PR #117 — Storefront Runtime Wave 0A–0D: still Draft and mergeable; its runtime migrations remain code-only pending the ordered release line.
3. Wave 1 / Golden #1 Monarche: depends on Wave 0 and must remain Draft while its base PR is not merged.

Wave 1 introduces no new database migration and does not edit `supabase/customer-baseline/`.

## Implemented Core Commerce component contracts

Reusable registry components were added on top of the Wave 0 primitives:

- `commerce.collection-navigation`
- `commerce.collection-header`
- `commerce.product-grid`
- `commerce.product-gallery`
- `commerce.product-info`
- `commerce.variant-swatches`
- `commerce.size-selector`
- `commerce.review-summary`
- `commerce.recommendation-row`
- `commerce.cart-summary`
- `commerce.checkout-summary`

These components declare page-type, configurable-field, binding-slot, responsive and capability contracts through the common Builder Foundation manifest model.

No renderer contains a `fashion.monarche` template-name branch. Template identity remains data in Page Schema/template manifests; renderer selection remains component-key + version driven.

## Editorial component contracts

Wave 1 adds reusable editorial/marketing components:

- `editorial.hero`
- `editorial.split-feature`
- `editorial.journal-preview`
- `marketing.newsletter-signup`
- `editorial.footer`

The Monarche visual language is therefore expressed as composition, tokens, configuration and bound content rather than a parallel template-specific rendering engine.

## Golden #1 Monarche visual DNA

The package records a stable visual direction:

- warm off-white background;
- black/graphite text;
- soft stone secondary surfaces;
- merchant-replaceable restrained accent;
- elegant serif display typography;
- clean sans-serif interface typography;
- generous whitespace;
- editorial fashion photography direction;
- quiet/minimal commerce chrome.

The package also exposes merchant-replaceable design-token hooks rather than hard-coding a merchant brand identity into shared runtime logic.

## Page package

`MONARCHE_TEMPLATE_PACKAGE` ships one Page Schema preset for each of its declared 14 page types:

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

Every page uses the common Wave 0 Page Schema and component registry.

## Approved Home composition

The Home composition is recorded in Page Schema metadata in this order:

1. Editorial Hero
2. Collection Navigation
3. New Arrivals
4. Editorial Split Feature
5. Product Story Grid
6. Featured Collection
7. Social Proof / Reviews
8. Journal Preview
9. Newsletter
10. Footer

The implementation test locks this ordering to prevent accidental template drift.

## Product detail / variant contract

The product page uses the generic attribute-based variant contract rather than fashion-only business logic.

Current Wave 1 behavior:

- color values may render as swatches;
- size values render as reusable selectable options;
- selected state is explicit;
- unavailable/sold-out values stay visible;
- unavailable values are disabled rather than silently removed;
- unsafe option URLs are rejected by renderer URL guards;
- desktop/tablet/mobile grid-span reflow is Page Schema driven;
- purchase CTA remains a binding surface and is not wired to a new checkout implementation in this branch.

The variant contract is intentionally reusable for later template families with different attribute names.

## Product discovery and checkout engine boundaries

Monarche records the agreed engine dependency contract without implementing deferred engines inside the template:

- E1: runtime — implemented by Wave 0 and consumed here;
- E2: Product Discovery — binding contract only in Wave 1;
- E13: Checkout — binding contract only in Wave 1;
- E7: Structured Product Info — optional/later.

Search pages expose an E2 binding surface. Checkout pages expose an E13 binding surface.

Wave 1 does not embed provider-specific payment behavior. No K&H/vPOS credentials, merchant identifiers, signing secrets or payment-provider implementation are present in the Monarche Page Schema.

## Template Capability Gate

The package is declared `minPlan=alap` and lists its required storefront capabilities through the existing Template Capability Gate.

Regression coverage proves both directions:

- missing capabilities fail closed;
- the actual `PLANS.alap.features` entitlement set passes the complete Monarche package.

A real implementation defect was exposed during CI: the catalog protected header and catalog collection-header section initially shared the same Page Schema node id. Runtime validation correctly failed with `NODE_ID_DUPLICATE`. The section was renamed to a stable unique id; no validation rule was weakened.

## Demo-content lifecycle

The package uses the namespace:

`fashion-monarche`

Neutral demo fixtures are included for representative collections, products and editorial content.

Installation planning uses the existing Wave 0D demo lifecycle:

- deterministic namespaced fixture identities;
- draft-only Page Schema materialization;
- merchant adoption remains authoritative;
- business/order/customer/B2B tables remain outside template mutation scope.

Local SVG editorial placeholders live under `public/storefront-demo/monarche/` so the package has deterministic non-third-party visual fixtures without introducing external asset dependencies.

## Mutation boundary

Wave 1 reuses the Wave 0D installation mutation boundary:

- `storefrontPageDrafts = true`
- products = false
- variants = false
- customers = false
- orders = false
- B2B = false

The Wave 1 diff contains no SQL migration, no Supabase schema change, no customer-baseline edit and no live production route switch.

## Regression coverage

Wave 1 adds focused coverage for:

- Core Commerce component registration;
- editorial component registration;
- Template Capability Gate fail-closed behavior;
- Alap entitlement compatibility;
- all 14 Monarche page presets;
- unique Page Schema node identities;
- approved Home section ordering;
- registry-driven Home rendering with bound commerce/editorial data;
- product-detail desktop/mobile responsive rendering;
- generic variant state rendering;
- sold-out values visible but disabled;
- unsafe variant URL rejection;
- draft-only template materialization;
- demo namespace integrity;
- no business-data mutation capability;
- checkout provider neutrality.

## CI evidence

Pre-documentation implementation head:

`33465f7a0ca756fc34dbfa642c2e023070bec36a`

GitHub CI #1861 / Actions run `34205173010`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — 191 files, 1244 tests
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 1 introduces no baseline migration and inherits the Wave 0/PR #115 ordered release dependency

The documentation commit must also pass the complete branch CI before Wave 1 implementation is considered documentation-complete.

## Explicit non-scope

- no production/shared-staging database migration;
- no new customer-baseline migration;
- no live storefront route switch;
- no merchant-facing Visual Builder/drag-and-drop UI;
- no new publish UI;
- no E2 Product Discovery engine implementation;
- no E7 structured-product-info engine implementation;
- no E13 checkout engine replacement;
- no payment/K&H/vPOS changes;
- no inventory authority rewrite;
- no production Vercel deployment;
- no Water-K tenant status change.

## Release discipline

Keep the Wave 1 PR Draft while PR #117 is Draft/unmerged. Wave 1 must be reviewed and merged into the Wave 0 branch first or rebased/retargeted after Wave 0 lands; it must not bypass the runtime dependency by being merged directly to `main` first.

No production rollout is authorized by Wave 1 CI alone.
