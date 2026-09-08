# Storefront Scale-out Wave 14 — Alpine Lodge

## Purpose
Wave 14 implements **Alpine Lodge** directly on top of Ritual House / PR #136.

- Template key: `outdoor.alpine-lodge`
- Category metadata: `outdoor-lifestyle`
- Base branch: `feature/storefront-ritual-house-wave13`
- Base final head: `fdb608a02b0988ae837eced42c0d2fccdd6d073f`
- Implementation head: `4abadcdbc8c46a771d4487a09a84a7609efb64f0`

This is code-only storefront scale-out: no SQL migration, no live route switch, no staging/production mutation, no payment change and no Water-K status change.

## Agreed visual direction
Alpine Lodge must feel like a real premium Swiss boutique lodge rather than a generic outdoor shop.

Visual DNA:
- warm natural luxury;
- dark timber;
- stone;
- wool and tactile natural materials;
- misty alpine / forest blue-grey atmosphere;
- restrained copper/bronze detail;
- editorial outdoor presentation;
- calm, generous spacing;
- refined serif + clean sans typography.

Explicit exclusions:
- red-dominant palette;
- terracotta-dominant palette;
- Christmas alpine cliché;
- sterile white luxury;
- rustic theme-park styling;
- unsupported performance claims;
- unsupported origin or sustainability claims.

The template therefore combines warm lodge materials with cooler misty mountain atmosphere without becoming red/brown chalet décor.

## Shopping journey
`collection → layer or use context → material → product → story`

The template may organize discovery around editorial collections, layers, materials and use context, but never invents technical performance, provenance, sustainability, price, stock or checkout authority.

## Engine contract
Alpine Lodge reuses shared Shoporation engines only:
- **E1 Runtime** — Page Schema/runtime authority;
- **E2 Product Discovery** — catalog/search authority;
- **E7 Structured Product / Compare & Spec data** — material, fit, care and other genuinely supplied product attributes;
- **E10 Editorial / Story Engine** — material, seasonal and lodge storytelling;
- **E13 Checkout** — provider-neutral checkout authority.

No Alpine-specific commerce or content authority is introduced.

Authority rule:
`template-presents-editorial-and-structured-evidence-but-never-invents-performance-origin-sustainability-price-stock-or-checkout-authority`

## Home composition
Exact Home order:
1. Alpine Hero
2. Shop by Collection
3. Seasonal Layers
4. Material Story
5. Featured Collection
6. Lodge Essentials
7. Crafted Details
8. Reviews
9. Field Journal
10. Footer

All sections use existing shared component contracts and remain Page Schema nodes rather than hardcoded route UI.

## Product page
Desktop/tablet:
- gallery 7/12;
- buybox 5/12.

Mobile:
- gallery and buybox 12/12.

PDP includes:
- common product info;
- common option selector;
- E7 `Anyag & részletek` key specs;
- purchase CTA;
- E7 grouped `Anyag, fit és kezelési adatok`;
- E10 `A kollekció története` editorial feature;
- common recommendation row.

Missing structured product data stays missing. The template does not infer waterproofing, windproofing, origin, sustainability certification or other performance claims.

## Content / journal
- Content preset role: `material-and-layer-guide`
- Content engine binding: `E7+E10`
- Blog Index uses the shared E10 story index as `Field Journal`.

## Package
Alpine Lodge ships 14 Alap-compatible Page Schema presets:
Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Minimum plan: `alap`

Demo namespace: `outdoor-alpine-lodge`

Demo fixtures:
- `alpine-layers` collection;
- `mist-wool-overshirt`;
- `stone-knit`;
- `ridge-carryall`;
- editorial material guide.

Deterministic local demo media:
- `public/storefront-demo/alpine-lodge/hero.svg`
- `public/storefront-demo/alpine-lodge/material.svg`
- `public/storefront-demo/alpine-lodge/detail.svg`

## Builder compatibility
The template is native to the existing Builder foundation:
- template manifest;
- Page Schema presets;
- shared components;
- responsive configuration;
- binding paths;
- namespaced demo lifecycle;
- draft-only template installation.

It does not create a one-off hardcoded storefront. The actual drag/drop Visual Builder UI remains deferred to its later roadmap block.

## Template-install safety
Mutation boundary remains:
- storefrontPageDrafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B: no mutation.

## Checkout
Checkout is E13-bound and provider-neutral. No K&H, vPOS, merchant credential or payment secret is embedded.

## Implementation diff
Compared with Ritual House final head `fdb608a02b0988ae837eced42c0d2fccdd6d073f`, implementation head `4abadcdbc8c46a771d4487a09a84a7609efb64f0` is exactly **1 commit ahead / 0 behind**.

Implementation adds only 5 files:
1. `src/lib/builder/templates/alpine-lodge.ts`
2. `tests/storefront-alpine-lodge-template.test.tsx`
3. `public/storefront-demo/alpine-lodge/hero.svg`
4. `public/storefront-demo/alpine-lodge/material.svg`
5. `public/storefront-demo/alpine-lodge/detail.svg`

No SQL/customer-baseline or pre-existing commerce-authority file is modified.

## Implementation CI evidence
Implementation head: `4abadcdbc8c46a771d4487a09a84a7609efb64f0`

GitHub CI #2026 / Actions run `34255321532`: **SUCCESS**.

Verified:
- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1342 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because no baseline migration is introduced.

Implementation release manifest:
- version: `v24`
- SHA: `4abadcdbc8c46a771d4487a09a84a7609efb64f0`
- ref: `feature/storefront-alpine-lodge-wave14`
- environment: `ci`
- release hash: `187f136349d9fdb05c07e9308c478411ab49a951260a62ee0c69eea03dc2f573`

The production build emitted only the existing non-blocking Supabase Edge-runtime/autoprefixer warnings.

## Explicit non-scope
Wave 14 does not implement:
- a new outdoor engine;
- inferred weather/performance certification;
- invented provenance or sustainability claims;
- new persistence authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- production deploy;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule
Wave 14 is closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Ritual House / PR #136 and verified mergeable.
