# Storefront Scale-out Wave 16 — Table & Gift

## Purpose

Wave 16 implements **Table & Gift** directly on top of Gallery Edit / PR #138.

- Template key: `food.table-gift`
- Template version: `1`
- Category metadata: `food-gifting`
- Base branch: `feature/storefront-gallery-edit-wave15`
- Base final head: `96f74bac17443f0c733f089da8decad3d13ecd11`
- Implementation head: `095f3b3beb3607d5aab32c3101329d906f6fa1ac`

This is a code-only storefront scale-out wave. It introduces no SQL migration, no live storefront route switch, no staging/production mutation, no payment change and no Water-K tenant-status change.

Per the current release discipline, **there is intentionally no Vercel/Supabase deployment after this individual wave**. Deployment is deferred until the current template-wave sequence is fully complete and can be handled as one controlled release candidate.

## Production-order rationale

The recovered storefront scale-out sequence places Table & Gift after the Interior Gallery slot. Gallery Edit currently occupies that slot in the working stack, therefore this wave is stacked directly above Gallery Edit.

The previously approved Table & Gift concept already defined the product/experience direction:

- premium gifting / occasion commerce;
- gastro curation;
- elegant bundle-building;
- Gift Finder;
- curated gift sets;
- Build Your Gift;
- Gift Message;
- Corporate Gift CTA;
- Gift Set Detail.

The earlier contract did **not** define a literal technical template identifier. Wave 16 therefore assigns `food.table-gift` following the existing storefront naming convention, including the existing `food.market-pantry` family.

## Visual DNA

Table & Gift is implemented as:

**premium gifting / occasion commerce × gastro curation × elegant bundle-building**

Palette direction:

- ivory background;
- deep burgundy primary;
- forest green secondary;
- champagne highlight;
- black text;
- muted gold accent.

Typography:

- elegant editorial serif for display use;
- clean sans-serif for interface copy.

Imagery:

- large gift still life;
- tabletop compositions;
- gastro/product curation;
- premium editorial presentation.

Spacing:

- generous;
- premium;
- editorial rather than dense marketplace presentation.

Explicit exclusions:

- cheap seasonal marketplace styling;
- fabricated fixed bundle price;
- virtual bundle SKU authority;
- fake scarcity;
- fabricated origin claims;
- fabricated dietary claims;
- guaranteed delivery wording without delivery authority;
- hardcoded corporate pricing.

## Shopping journey

The structural journey is:

`Gift Finder → Curated Gift Sets → Build Your Gift → message / pairing → cart → checkout`

The template assists discovery and composition but does not become a second product, price, inventory, delivery, B2B or order authority.

## Engine contract

Table & Gift reuses only existing Shoporation engines:

- **E1 Runtime** — common Page Schema/runtime authority;
- **E2 Product Discovery** — eligible catalog/discovery authority;
- **E3 Guided Finder** — recipient / occasion / budget / preference-driven gift discovery;
- **E4 Multi-Product Composer** — Build Your Gift using real catalog items;
- **E10 Editorial / Story Engine** — gift, occasion, producer and product story read models;
- **E13 Checkout** — provider-neutral cart/checkout and final commerce revalidation authority.

No new gifting engine, recommendation authority, bundle product model, pricing authority or checkout authority is introduced.

Authority rule:

`template-never-invents-price-stock-availability-origin-dietary-truth-delivery-date-or-corporate-pricing`

## E3 → E4 registry composition

The existing Builder/runtime architecture already composes these surfaces safely:

- `createStorefrontMultiProductComposerComponentRegistry()` extends the Guided Finder component registry;
- `createStorefrontMultiProductComposerRendererRegistry()` extends the Guided Finder renderer registry.

Therefore Table & Gift can present both:

- `guided.finder`
- `composer.builder`

inside one Page Schema without adding a template-specific runtime branch or a second engine.

E10 is consumed through shared editorial/story binding surfaces rather than creating another combined registry solely for this template.

## Home composition

Current coherent Home Page Schema order:

1. Gift Hero
2. Shop by Occasion
3. Gift Finder
4. Curated Gift Sets
5. Build Your Gift
6. Gift Message
7. Corporate Gift CTA
8. Gift Story
9. Reviews
10. Footer

This order implements the previously accepted Table & Gift concepts in one coherent shopping journey. It is a structural implementation order for Wave 16; this document does not claim that a separate earlier literal section-by-section Home ordering had been recorded.

## Gift Finder

Component:

- `guided.finder`

Purpose:

- recipient;
- occasion;
- budget;
- preference-based product discovery.

The Finder ranks only products already eligible through the surrounding commerce/discovery authority.

It does not:

- create products;
- override visibility/channel authority;
- override price;
- override inventory;
- promise delivery;
- infer unsupported dietary/origin facts.

## Build Your Gift

Component:

- `composer.builder`

The composition is built from **real catalog products**.

The template may present:

- composition mode;
- progress;
- slots;
- available eligible products;
- current displayed subtotal;
- revalidation notice;
- compose/check action.

It does not create a virtual bundle SKU or a second product authority.

The final product variants, prices, stock and other commerce values remain authoritative only after server/cart revalidation.

## Gift Message

The Home `Gift Message` section is currently a presentation / binding surface only.

It may display a message preview or copy supplied by the surrounding context when the actual checkout/order flow supports such data.

The template itself:

- does not write an order;
- does not persist gift-message data;
- does not introduce an order mutation API;
- does not bypass existing order authority.

A future merchant-facing editor may configure the section presentation through Builder contracts, but persistence remains owned by the relevant commerce/order workflow.

## Corporate Gifts

The `Corporate Gift CTA` is deliberately presentation/contact-oriented.

It provides a route for corporate gifting enquiries without introducing:

- automatic B2B pricing;
- reseller status;
- role/approval authority;
- MOQ/order-multiple authority;
- quote/offer authority;
- corporate tax/pricing decisions.

Those remain owned by existing server-side B2B/commercial systems.

## Editorial / Gift Story

Table & Gift can present curated gift, occasion, producer or product stories through the existing editorial/story layer.

Origin, producer, dietary, certification or similar factual claims must come from genuine authoritative source data. The template may not fabricate such claims for visual storytelling.

## Catalog and search

Catalog remains an E2 discovery surface with occasion-oriented collection navigation.

Search combines:

- E2 result authority;
- optional E3 Guided Finder assistance.

The Finder does not replace search eligibility/channel authority.

## Product / Gift Set Detail

Product role metadata:

- `gift-set-detail`

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- gallery and buybox: 12/12.

PDP reuses:

- common product gallery;
- common product info;
- generic option selector;
- purchase CTA;
- `composer.pairing-row` for related real products;
- common product recommendations.

Pairing items remain independent real products and enter cart/order authority through normal commerce flows.

## Cart

Cart combines:

- `composer.summary` for composed gift-group presentation;
- common `commerce.cart-summary`.

The composition summary does not replace cart lines or pricing authority.

Final commerce values remain revalidated.

## Checkout

Checkout combines:

- `composer.summary`;
- common `commerce.checkout-summary`.

Engine binding:

- `E4+E13`

Checkout remains provider-neutral.

No K&H, vPOS, merchant identifier, payment secret or provider credential is embedded in the Table & Gift Page Schema.

## Account

Account may display prior composed gift grouping through:

- `composer.order-group`

This is a read/presentation surface over existing order data and does not become an order ledger or refund authority.

## Content / Gift Guide

Content preset combines:

- Gift Finder;
- Build Your Gift;
- editorial Gift Guide.

Metadata:

- `contentRole = gift-guide`
- `engineBinding = E3+E4+E10`

## Page package

Table & Gift ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Gift Guide
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan:

- `alap`

Demo namespace:

- `food-table-gift`

## Demo fixtures

Namespaced demo fixtures:

- collection `birthday-gifts`;
- collection `thank-you-gifts`;
- product `pantry-selection`;
- product `table-selection`;
- content `gift-guide`.

Deterministic local demo media:

- `public/storefront-demo/table-gift/hero.svg`
- `public/storefront-demo/table-gift/story.svg`
- `public/storefront-demo/table-gift/build.svg`

Demo/test coverage rejects invented fixed bundle pricing, virtual bundle SKU claims, guaranteed delivery, unsupported dietary certification and fake scarcity.

## Builder compatibility

Table & Gift is native to the existing Builder foundation:

- versioned template manifest;
- Page Schema presets;
- shared component registry;
- shared E3/E4 renderer registry chain;
- controlled binding paths;
- responsive configuration;
- capability gate;
- namespaced demo lifecycle;
- draft-only template installation.

It is not implemented as a hardcoded route or template-name conditional renderer.

The actual drag/drop Visual Builder editor and merchant-facing Section Preset Library remain intentionally deferred to their later roadmap blocks.

## Template-install mutation boundary

The existing installation boundary remains:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

Gift Finder configuration, actual order/gift-message persistence and business authority remain outside template-switch ownership.

## Regression coverage

Wave 16 tests verify:

- exact `food.table-gift` key/version;
- accepted premium gifting/occasion/gastro direction;
- structural gifting journey;
- E1/E2/E3/E4/E10/E13 engine contract;
- 14 Alap-compatible Page Schema presets;
- current coherent Home composition;
- E3 Guided Finder rendering;
- E4 Gift Builder rendering;
- occasion navigation;
- curated real-product gift sets;
- editorial gift story surface;
- responsive 7/12 + 5/12 PDP and 12/12 mobile reflow;
- pairings as separate real products;
- draft-only template installation;
- no fake bundle SKU/fixed price/scarcity/delivery/dietary claim;
- Corporate Gift CTA without B2B authority;
- Gift Message without order mutation authority;
- provider-neutral E13 checkout.

## Implementation diff evidence

Compared with Gallery Edit final head `96f74bac17443f0c733f089da8decad3d13ecd11`, Table & Gift implementation head `095f3b3beb3607d5aab32c3101329d906f6fa1ac` is exactly:

- **1 commit ahead**;
- **0 commits behind**;
- **5 added files**;
- **0 deletions**.

Implementation files:

1. `src/lib/builder/templates/table-gift.ts`
2. `tests/storefront-table-gift-template.test.tsx`
3. `public/storefront-demo/table-gift/hero.svg`
4. `public/storefront-demo/table-gift/story.svg`
5. `public/storefront-demo/table-gift/build.svg`

No SQL/customer-baseline or pre-existing commerce/B2B authority file is modified.

## Implementation CI evidence

Implementation head:

`095f3b3beb3607d5aab32c3101329d906f6fa1ac`

GitHub CI #2033 / Actions run `34260650765`: **SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1344 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 16 introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `095f3b3beb3607d5aab32c3101329d906f6fa1ac`
- ref: `feature/storefront-table-gift-wave16`
- environment: `ci`
- release hash: `79b616ffdafa84a55a1b1381ca63393a1ee17bbcb32f0719e732c7f4e5887e17`

The production build emitted only already-known non-blocking Supabase Edge-runtime/autoprefixer warnings.

## Deployment discipline

Wave 16 intentionally stops at implementation/CI/documentation/stacked-Draft-PR closure.

There is **no per-wave Vercel or Supabase deployment**.

The current template-wave sequence will be accumulated first. Once all target waves are complete, a single controlled release-candidate process can validate and deploy the combined stack, minimizing build/deploy churn and protecting the existing production environment.

## Explicit non-scope

Wave 16 does not implement:

- a new gifting engine;
- virtual bundle SKU authority;
- fixed bundle price authority;
- product/pricing/inventory authority;
- delivery-date promise authority;
- dietary/origin certification authority;
- Gift Message persistence or direct order mutation;
- corporate/B2B pricing or membership authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- Vercel Preview deployment;
- production deployment;
- Supabase production mutation;
- payment/K&H/vPOS change;
- Water-K tenant-status change.

## Closure rule

Wave 16 is fully implementation-closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Gallery Edit / PR #138 and verified mergeable.
