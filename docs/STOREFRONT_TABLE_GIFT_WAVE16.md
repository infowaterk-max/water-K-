# Storefront Scale-out Wave 16 — Table & Gift

## Purpose

Wave 16 implements **Table & Gift** directly on top of Gallery Edit / PR #138.

- Template key: `food.table-gift`
- Template version: `1`
- Category metadata: `food-gifting`
- Base branch: `feature/storefront-gallery-edit-wave15`
- Base final head: `96f74bac17443f0c733f089da8decad3d13ecd11`
- Accepted implementation head: `d0cbdfc64fb94b53f8b1bba8c8246933f9f9d475`

This is a code-only storefront scale-out wave. It introduces no SQL migration, live storefront route switch, staging/production mutation, payment change or Water-K tenant-status change.

Per the current release discipline, **there is intentionally no Vercel or Supabase deployment after this wave**. Deployment is deferred until the current template-wave sequence is fully complete and can be handled as one controlled release candidate.

## Accepted template direction

Table & Gift is the third Food-family template and is deliberately distinct from Market Pantry.

Its accepted role is:

**premium gifting / occasion commerce × curated food/gift selection × configurable gifting**

Primary experience elements:

- Gift Builder;
- Shop by Occasion;
- Curated Gift Sets;
- Build Your Gift;
- Gift Message;
- Corporate Gift CTA.

Market Pantry remains pantry/market/composer-first commerce. Table & Gift is occasion-, recipient- and gifting-first.

## Visual DNA

Palette:

- ivory background;
- deep burgundy primary;
- forest green secondary;
- champagne accent;
- black text.

Typography:

- elegant editorial serif for display headings;
- clean sans-serif for interface copy.

Imagery:

- gift boxes;
- ribbon;
- premium table settings;
- curated food/drink packaging;
- editorial still life.

Spacing:

- generous;
- celebratory;
- refined.

Explicit exclusions:

- Market Pantry duplication;
- rustic/farmhouse treatment;
- promotion chaos;
- fabricated fixed-price gift boxes;
- virtual bundle SKUs;
- fake scarcity;
- baked marketing copy inside demo imagery.

## Shopping journey

The accepted structural journey is:

`guided gift choice → occasion → curated set → composed gift → gift message → corporate contact / checkout`

The template assists discovery and composition but does not become a second product, price, stock, B2B, delivery or order authority.

## Engine contract

Table & Gift reuses only existing Shoporation engines:

- **E1 Runtime** — common Page Schema/runtime authority;
- **E2 Product Discovery** — eligible catalog/channel discovery authority;
- **E3 Guided Finder** — Gift Builder for occasion, recipient and preference-driven discovery;
- **E4 Multi-Product Composer** — Build Your Gift from real catalog items;
- **E13 Checkout** — provider-neutral cart/checkout and final commerce revalidation authority.

Required full experience:

`E1 + E2 + E3 + E4 + E13`

**E10 is not part of the accepted Wave 16 engine contract.** No extra story engine is required to implement the accepted Table & Gift flow.

Authority rule:

`gift-guidance-and-composition-never-invent-price-stock-eligibility-message-delivery-or-order-authority`

## E3 and E4 separation

The two user-facing builder concepts are intentionally separate:

### Gift Builder — E3 Guided Finder

Purpose:

- ask structured questions;
- guide by occasion;
- guide by recipient/preference;
- rank only already-eligible products;
- expose explainable matching evidence.

It does not:

- create products;
- create bundles;
- override channel eligibility;
- override pricing;
- override stock;
- create an order.

### Build Your Gift — E4 Multi-Product Composer

Purpose:

- compose a gift from **real catalog products**;
- show composition progress;
- show available eligible items;
- display a non-authoritative current subtotal;
- produce a composition intent that requires normal commerce revalidation.

It does not:

- create a virtual bundle SKU;
- create a fixed bundle price authority;
- create discount authority;
- create inventory authority;
- silently replace unavailable products.

The existing combined E4 registry is reused. `createStorefrontMultiProductComposerComponentRegistry()` already extends the Guided Finder registry, and the corresponding renderer registry already includes Guided Finder renderers. No Table & Gift-specific renderer branch is added.

## Exact Home composition

The accepted Home sequence is locked in metadata and regression tests:

1. Gift Builder
2. Shop by Occasion
3. Curated Gift Sets
4. Build Your Gift
5. Gift Message
6. Corporate Gift CTA
7. Footer

No additional Gift Hero, Gift Story or Reviews section is inserted into the accepted Wave 16 Home contract.

### Gift Builder

Uses `guided.finder` from E3.

### Shop by Occasion

Uses shared `commerce.collection-navigation`.

### Curated Gift Sets

Uses shared `commerce.product-grid` with normal product/catalog authority.

### Build Your Gift

Uses `composer.builder` from E4 over real catalog items.

### Gift Message

Uses a shared editorial presentation surface. This is a presentation/binding contract only; the template does not introduce gift-message persistence or order mutation authority.

### Corporate Gift CTA

Uses a shared presentation/contact CTA. It does not create corporate pricing, partner approval, MOQ, quote or B2B authority.

## Catalog and search

Catalog and search remain E2 authority surfaces.

Occasion navigation can organize existing eligible products. Guided Finder assistance may rank or explain products, but does not replace catalog/channel eligibility.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- gallery and buybox reflow to 12/12.

PDP includes:

- common product gallery;
- common product information;
- purchase CTA;
- E3 explanation surface: `Miért illik az alkalomhoz?`;
- common recommendation row.

Finder evidence remains explanatory and cannot override commerce authority.

## Cart

Cart may show E4 `composer.summary` for a composed gift together with the common cart summary.

Composition grouping is presentation/read-model information. Final product lines, price, stock, channel and order state remain governed by existing commerce authority.

## Checkout and Gift Message

Checkout is bound to **E13** and remains provider-neutral.

The checkout Page Schema may display an `Ajándéküzenet` presentation/help surface. The template itself does not persist the message and does not create a new checkout/order mutation API.

No K&H, vPOS, merchant credential or payment secret is embedded in the template.

## Corporate gifting boundary

Corporate Gift CTA is contact-oriented only.

It does not introduce:

- automatic corporate pricing;
- reseller/partner status;
- approval authority;
- MOQ/order-multiple authority;
- quote/offer authority;
- corporate tax authority.

Existing server-side B2B/commercial systems remain authoritative where those features are later used.

## Page package

Table & Gift ships 14 Alap-compatible Page Schema presets:

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

Content role:

`gift-builder-hub`

Content engine binding:

`E3+E4`

Minimum plan:

`alap`

Demo namespace:

`food-table-gift`

## Demo content

Namespaced fixtures:

- collection `birthday-gifts`;
- collection `thank-you-gifts`;
- product `celebration-box`;
- product `table-selection`;
- content `corporate-gifting`.

Deterministic local media:

- `public/storefront-demo/table-gift/message.svg`
- `public/storefront-demo/table-gift/corporate.svg`
- `public/storefront-demo/table-gift/gift.svg`

Demo fixtures are regression-checked against fabricated fixed-price, guaranteed-stock, limited-time, bundle-SKU and exclusive-price authority claims.

## Builder compatibility

Table & Gift is native to the existing Builder/runtime foundation:

- Template Manifest;
- Page Schema presets;
- shared component registry;
- E3/E4 component-key/version rendering;
- responsive configuration;
- binding paths;
- namespaced demo lifecycle;
- draft-only template installation.

No `food.table-gift` conditional runtime renderer branch is introduced.

The actual drag/drop Visual Builder UI remains deferred to its later roadmap block.

## Template-install safety

The established mutation boundary remains:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

Finder configuration, Composer configuration and commerce authorities remain outside template-switch mutation ownership.

## Implementation correction evidence

During Wave 16 the branch received a parallel preliminary Table & Gift composition that included extra Home sections and E10. That state did not match the recovered accepted blueprint.

The branch was corrected with a normal fast-forward commit — no force push — to the accepted contract:

`Gift Builder → Shop by Occasion → Curated Gift Sets → Build Your Gift → Gift Message → Corporate Gift CTA → Footer`

with engine contract:

`E1 + E2 + E3 + E4 + E13`

A subsequent CI run correctly found two invalid test import paths for the existing E4 registry. The validator and engine contracts were not weakened. The imports were corrected to the real shared modules:

- `@/components/builder/storefront-multi-product-composer`
- `@/lib/builder/storefront-multi-product-composer`

## Accepted implementation CI evidence

Accepted implementation head:

`d0cbdfc64fb94b53f8b1bba8c8246933f9f9d475`

GitHub **CI #2040 / Actions run `34261111988`: SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1344 tests PASS**;
- TypeScript: PASS;
- GitHub production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 16 introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `d0cbdfc64fb94b53f8b1bba8c8246933f9f9d475`
- ref: `feature/storefront-table-gift-wave16`
- environment: `ci`
- release hash: `1f171304d9450dca3fba6eb5e47b712aea86408248cb693335a8a3744b66316e`

The GitHub production-build step is CI compilation only and is **not a Vercel/Supabase deployment**.

## Explicit no-deploy rule

Wave 16 does not trigger:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging mutation;
- Supabase production mutation;
- production migration.

Deployment remains deferred until the current storefront template-wave sequence is complete.

## Explicit non-scope

Wave 16 does not implement:

- a new gifting engine;
- E10 Story Engine as a required Table & Gift dependency;
- Gift Hero/Gift Story/Reviews additions to the accepted Home contract;
- virtual bundle SKU authority;
- fixed gift-box price authority;
- automatic substitution;
- gift-message persistence authority;
- corporate pricing or B2B authority;
- delivery-date guarantee authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- production deployment;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 16 is fully closed only after this corrected documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Gallery Edit / PR #138 and verified mergeable.
