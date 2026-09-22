# Storefront Scale-out Wave 15 — Gallery Edit

## Purpose

Wave 15 implements **Gallery Edit** directly on top of Alpine Lodge / PR #137.

- Template key: `home.gallery-edit`
- Category metadata: `home-living-design`
- Base branch: `feature/storefront-alpine-lodge-wave14`
- Base final head: `51b7696497d7d64da300198c822ef9b9b3ca6eb9`
- Implementation head: `a25f0b4082768622121631ef29463cfb4d00e9c3`

This wave is code-only storefront scale-out. It introduces no SQL migration, live route switch, staging/production mutation, payment change or Water-K status change.

## Historical-reference note

The exact earlier Gallery Edit visual blueprint was not recoverable with sufficient confidence from the currently available project/repository context during this wave.

The implementation therefore preserves the already accepted **Gallery Edit** template slot/name and builds a coherent contemporary interior/design-gallery commerce contract from the shared Shoporation runtime without inventing a new engine or one-off storefront architecture.

This wave **does not claim screenshot/pixel-diff acceptance** against the original approved visual reference.

Literal visual acceptance remains a later step and must compare the rendered template directly against the original approved Gallery Edit reference. If that comparison reveals spacing, proportion, typography, layer or composition differences, the reference wins and the template must be adjusted without weakening the shared runtime contracts.

## Current structural visual contract

Gallery Edit is implemented as a contemporary interior/design concept store × gallery.

Visual DNA:

- chalk/off-white background;
- limestone-grey surfaces;
- graphite typography;
- one restrained curatorial accent;
- editorial grotesk or refined-serif display direction;
- clean sans-serif interface typography;
- furniture, lighting, ceramics, textiles and objects presented as gallery pieces;
- large negative space;
- airy, precise gallery-scale spacing.

Explicit exclusions:

- busy marketplace composition;
- rustic farmhouse styling;
- overloaded gold-luxury styling;
- streetwear visual language;
- fabricated designer provenance;
- fabricated material claims;
- baked marketing wording inside demo imagery.

## Shopping journey

Current structural journey:

`edit → room or object type → material → object → story`

This is merchandising/navigation presentation only. The template never invents designer provenance, material truth, dimensions, price, stock or availability.

## Engine contract

Gallery Edit reuses shared Shoporation engines only:

- **E1 Runtime** — common Page Schema/runtime authority;
- **E2 Product Discovery** — catalog/search/channel discovery authority;
- **E7 Compare & Spec / structured product data** — material, dimensions, finish, care and other genuinely supplied object attributes;
- **E10 Editorial / Story Engine** — room, studio, designer/brand and object editorial stories;
- **E13 Checkout** — provider-neutral checkout authority.

No Gallery Edit-specific commerce, material, designer, inventory, pricing or content authority is introduced.

Authority rule:

`gallery-presentation-never-invents-designer-provenance-material-dimensions-price-stock-or-availability`

## Home composition

Current Page Schema Home order:

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

The sequence is implemented from shared registry components and remains Builder-compatible rather than hardcoded into a storefront route.

## Shared component reuse

Gallery Edit reuses existing components including:

- `story.hero`
- `story.feature`
- `story.index`
- `commerce.collection-navigation`
- `commerce.product-grid`
- `commerce.key-specs`
- `commerce.product-gallery`
- `commerce.product-info`
- `commerce.option-selector`
- `commerce.specification-groups`
- `commerce.recommendation-row`
- `commerce.review-summary`
- `commerce.cart-summary`
- `commerce.checkout-summary`
- common layout/header/navigation/footer primitives.

There is no `home.gallery-edit` conditional renderer branch.

## Catalog and search

Catalog/search remain E2 discovery surfaces.

The template may organize or expose registered E7 data such as:

- room/use context;
- object type;
- material;
- dimensions;
- finish;
- care information.

Missing structured data stays missing. The template does not infer or fabricate these values.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- gallery and buybox reflow to 12/12.

PDP includes:

- common product information;
- generic option selector;
- E7 `Object Details` key specs;
- purchase CTA;
- grouped E7 `Anyag, méret, finish és kezelés` data;
- E10 `Object / Studio Note` editorial feature;
- common recommendation row.

Designer/studio stories remain editorial relations/content and may not be converted into unverified provenance claims.

## Content and Journal

Content preset:

- `contentRole = gallery-story`
- `engineBinding = E7+E10`

Blog Index uses the shared E10 Story Index for `Rooms, objects, studios` editorial content.

## Page package

Gallery Edit ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Gallery Story
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan: `alap`

Demo namespace: `home-gallery-edit`

## Demo fixtures

Namespaced demo fixtures:

- collection `living-edit`;
- lighting product `arc-lamp`;
- object `stone-vessel`;
- furniture product `linen-chair`;
- editorial `studio-story`.

Deterministic local demo media:

- `public/storefront-demo/gallery-edit/hero.svg`
- `public/storefront-demo/gallery-edit/studio.svg`
- `public/storefront-demo/gallery-edit/object.svg`

Demo fixtures are regression-checked against unsupported designer/provenance/material claims.

## Builder compatibility

Gallery Edit is native to the existing Builder foundation:

- template manifest;
- Page Schema presets;
- shared component registry;
- responsive configuration;
- binding paths;
- namespaced demo lifecycle;
- draft-only template installation.

It is not implemented as a one-off hardcoded route. The actual drag/drop Visual Builder UI and merchant-facing Section Preset library remain intentionally deferred to their later roadmap blocks.

## Template-install safety

The established mutation boundary remains:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

E7 product data and E10 story authority remain outside template-switch ownership.

## Checkout

Checkout remains E13-bound and provider-neutral.

No K&H, vPOS, merchant credential or payment secret is embedded in Gallery Edit Page Schema.

## Regression coverage

Wave 15 verifies:

- exact `home.gallery-edit` key/version;
- home/living/design category metadata;
- contemporary gallery-commerce structural visual DNA;
- E1/E2/E7/E10/E13 engine boundary;
- exclusions against marketplace/rustic/fake provenance/material claims;
- 14 Alap-compatible Page Schema presets;
- exact current Home sequence;
- shared story + commerce registry validation;
- product/material/editorial rendering together;
- desktop/tablet 7/12 + 5/12 PDP layout;
- 12/12 mobile reflow;
- E7 Object Details and dimensions/material evidence;
- draft-only namespaced installation;
- provider-neutral E13 checkout.

## Implementation diff

Compared with Alpine Lodge final head `51b7696497d7d64da300198c822ef9b9b3ca6eb9`, implementation head `a25f0b4082768622121631ef29463cfb4d00e9c3` is exactly:

- **1 commit ahead**;
- **0 commits behind**;
- **5 added files**;
- **0 deletions**.

Implementation files:

1. `src/lib/builder/templates/gallery-edit.ts`
2. `tests/storefront-gallery-edit-template.test.tsx`
3. `public/storefront-demo/gallery-edit/hero.svg`
4. `public/storefront-demo/gallery-edit/studio.svg`
5. `public/storefront-demo/gallery-edit/object.svg`

No SQL/customer-baseline or pre-existing commerce-authority file is modified.

## Implementation CI evidence

Implementation head:

`a25f0b4082768622121631ef29463cfb4d00e9c3`

GitHub CI #2029 / Actions run `34257431086`: **SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1343 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 15 introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `a25f0b4082768622121631ef29463cfb4d00e9c3`
- ref: `feature/storefront-gallery-edit-wave15`
- environment: `ci`
- release hash: `9df18ae0308fbde76196865ff89e6608f50e16ab1ea528c4f1e23c2bb808549b`

The production build emitted only already-known non-blocking Supabase Edge-runtime and autoprefixer warnings.

## Visual acceptance boundary

Code-level/structural acceptance in this wave means:

- valid template package;
- correct shared-engine reuse;
- responsive Page Schema coverage;
- Builder compatibility;
- safe authority boundaries;
- full CI success.

It does **not** mean that the current render has already been proven pixel-for-pixel equal to the original approved Gallery Edit visual.

Before final template-launch acceptance, the rendered desktop/tablet/mobile views must be compared with the original approved reference. The approved reference remains authoritative for exact visual composition.

## Explicit non-scope

Wave 15 does not implement:

- screenshot/pixel-diff acceptance tooling;
- a new Gallery engine;
- designer provenance authority;
- material truth authority;
- product/pricing/inventory authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- production deploy;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 15 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Alpine Lodge / PR #137 and verified mergeable.
