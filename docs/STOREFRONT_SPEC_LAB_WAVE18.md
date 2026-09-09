# Storefront Scale-out Wave 18 — Spec Lab

## Purpose

Wave 18 implements **Spec Lab** directly on top of Creator Station / PR #140.

- Canonical template key: `tech.spec-lab`
- Template version: `1`
- Previous working name preserved as alias: `Tech Command`
- Category: Electronics & Technology #3
- Base branch: `feature/storefront-creator-station-wave17`
- Base final head: `dbc16e8895d47f791453b52df87f1954afbee43e`
- Accepted implementation head: `c2c3987598e67159cfe4b7643f1e32601b42e662`

This is a code-only storefront scale-out wave. It introduces no SQL migration, customer-baseline mutation, production route switch, payment change, deployment or Water-K status change.

## Recovered template identity

The earlier Electronics & Technology #3 concept used two working names: **Spec Lab / Tech Command**. Wave 18 resolves the canonical package name to **Spec Lab** while retaining `Tech Command` as legacy design metadata.

The accepted concept is a specialist technology decision environment rather than a generic electronics shop and explicitly differs from both:

- Tech Deck — clean, bright consumer-tech commerce;
- Creator Station — dark creator-workflow commerce.

Spec Lab focuses on structured technical decision support, comparison, system compatibility and setup construction.

## Accepted purchase journey

The recovered decision path is locked as:

`Mit keresel? → Mire használod? → Hasonlítsd össze → Tech Finder → Építsd fel a szetted`

This is implemented with existing shared runtime components and engines rather than a template-specific decision engine.

## Visual DNA

Character:

`dark-navy-specialist-tech-decision-lab`

Palette:

- deep navy background;
- technical navy panels;
- cool ivory/white text;
- controlled orange/ochre primary accent;
- muted steel-blue secondary accent;
- signal green for positive compatibility evidence;
- amber for caution/unknown-adjacent states.

Typography:

- strong technical sans display;
- clean sans UI;
- monospaced specification/data labels.

Visual language:

- specification grids;
- comparison rails;
- compatibility nodes;
- Finder paths;
- system maps;
- evidence-driven decision surfaces.

Explicit exclusions:

- gamer RGB;
- neon/rainbow styling;
- white-background content blocks;
- sterile SaaS appearance;
- fabricated specifications;
- fabricated compatibility;
- fabricated performance guarantees;
- fabricated trade-in valuation.

Core design tokens include:

- background `#08111F`;
- surface `#0F1C2E`;
- accent `#D98A2B`.

## Engine contract

Required full experience:

`E1 + E2 + E3 + E5 + E6 + E7 + E10 + E13`

### E1 — Runtime

Shared Page Schema, responsive resolution, component registry and binding runtime.

### E2 — Product Discovery

Owns catalog/search/channel eligibility. The template cannot expose or sell a product that the commerce authority considers unavailable or ineligible.

### E3 — Guided Finder

Owns Tech Finder guidance based on use case, requirements and preferences.

It can rank/filter eligible products but does not create products, prices, inventory or orders.

### E5 — Product Configurator

Owns slot-based system/setup construction for compatible products and accessories.

Wave 18 does not create a second system-builder authority.

### E6 — Compatibility

Owns product/system/accessory compatibility and its evidence.

Locked rules:

- Unknown is never Compatible;
- compatibility must remain explainable;
- final validation is server-authoritative;
- no silent replacement/substitution.

### E7 — Structured Product / Compare & Spec

Owns:

- detailed specifications;
- comparison rows;
- technical catalog facets;
- key specs;
- system requirements.

No duplicate technical attribute/specification registry is introduced.

### E10 — Editorial / Story

Owns Tech Magazine / buying-guide content authority.

The template only presents the resulting editorial read model through common editorial components.

### E13 — Checkout

Remains provider-neutral cart/checkout and final commerce validation authority.

Global authority rule:

`decision-support-never-invents-specs-price-stock-compatibility-performance-trade-in-value-or-order-authority`

## Home composition

The accepted Home sequence is locked in metadata and regression tests:

1. Mit keresel?
2. Mire használod?
3. Hasonlítsd össze
4. Tech Finder
5. Építsd fel a szetted
6. Compatibility Matrix
7. System Requirements
8. Accessory Matcher
9. Trade-in
10. Tech Magazine
11. Footer

No RGB/gamer treatment and no standalone white hero/content block is inserted.

### Mit keresel?

Common collection navigation provides technology/product-family entry points.

### Mire használod?

Shared Guided Finder attribute navigation provides use-case discovery.

### Hasonlítsd össze

Uses the existing E7 compare spotlight with real structured comparison rows.

### Tech Finder

Uses `guided.finder` from E3.

### Építsd fel a szetted

Uses `configurator.builder` from E5 with real catalog products and server revalidation requirements.

### Compatibility Matrix

Uses E6 status and criterion-level evidence. Missing evidence remains Unknown.

### System Requirements

Uses E7 key-spec presentation bound under existing product authority.

### Accessory Matcher

Uses the common recommendation row. Recommendations remain downstream of product/channel eligibility and do not manufacture compatibility.

### Trade-in

Trade-in is deliberately an **integration/read-model hook only**.

The template can link to a merchant's genuine trade-in program, but it does not:

- estimate a device value;
- promise a buy-back amount;
- create a second pricing authority;
- persist a trade-in lifecycle.

The Home copy explicitly states that no valuation is produced by the template.

### Tech Magazine

Uses shared editorial presentation and remains downstream of E10 story/content authority.

## Optional 3D Product Viewer hook

The previous concept included a 3D Product Viewer.

Wave 18 does **not** invent a template-owned 3D engine. The PDP contains only an optional external viewer-launch hook through the existing safe product binding namespace:

`product.viewerHref`

If no real viewer integration/read model exists, the template cannot fabricate a 3D representation or product geometry.

This keeps the template Builder-ready without prematurely introducing a new core engine or artificial plan paywall.

## Binding Layer hardening

During implementation an early draft used ad-hoc `system.*` and `story.*` binding namespaces.

The current Storefront Binding Layer uses an explicit namespace allowlist. Wave 18 was corrected **without relaxing that allowlist**.

Final bindings use existing authorities:

- System Requirements → `product.systemRequirements`
- Tech Magazine → `content.techMagazineItems`
- compare state → `commerce.*`
- Finder → `finder.*`
- Configurator → `configurator.*`
- Compatibility → `compatibility.*`

Therefore Wave 18 does not expand the foundation contract merely to accommodate one template.

## Catalog and search

Catalog:

- use-case/technical navigation;
- E7 structured facets;
- common product grid;
- E2 remains eligibility authority.

Search:

- E3 guided-result presentation;
- E2 search/product authority;
- E7 structured technical context.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- both 12/12.

PDP includes:

- common product gallery;
- common product information;
- generic option selector;
- E7 Key Specs;
- compare action;
- optional external 3D-viewer hook;
- standard purchase CTA;
- E7 detailed specification groups;
- E6 compatibility status/evidence;
- accessory recommendations.

The template cannot infer or fabricate ports, standards, performance, compatibility or supported configurations.

## Cart / account / checkout

Cart can display an E5 setup summary plus the common cart summary.

Before checkout, current price, stock, channel eligibility and compatibility require normal server-side revalidation.

Account may display a saved setup, but saved state is not a guarantee of current price, stock or compatibility.

Checkout is bound to E13 and remains provider-neutral. The template contains no K&H/vPOS secret or merchant authority.

## Content / System Builder preset

Content role:

`tech-finder-and-system-builder`

Engine binding:

`E3+E5+E6+E7`

It composes:

- Tech Finder;
- system/setup builder;
- compatibility status;
- compatibility evidence.

It introduces no new persistence or commerce authority.

## Page package

Spec Lab ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Tech Finder + System Builder
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan:

`alap`

Demo namespace:

`tech-spec-lab`

All core template functionality remains available under the shared Alap template capability contract; no artificial Pro-only engine gate was introduced.

## Demo content

Namespaced fixtures:

- collection `performance-computing`;
- collection `mobile-tech`;
- product `spec-lab-hub`;
- product `spec-lab-display`;
- content `standards-guide`.

Deterministic local media:

- `public/storefront-demo/spec-lab/matrix.svg`
- `public/storefront-demo/spec-lab/system.svg`
- `public/storefront-demo/spec-lab/finder.svg`

Regression coverage rejects fabricated compatibility, guaranteed performance, fixed setup-price authority and trade-in valuation.

## Builder compatibility

Spec Lab stays inside the existing Builder/runtime foundation:

- Template Manifest;
- Page Schema presets;
- shared component registry;
- component-key/version rendering;
- responsive Page Schema configuration;
- allowlisted bindings;
- E3/E5/E6/E7 reusable components;
- namespaced demo lifecycle;
- draft-only template installation.

No merchant-facing drag/drop Visual Builder UI is introduced in this wave.

## Template-install mutation boundary

Template install/switch remains presentation-only:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

Product/specification, Finder, Configurator, Compatibility, editorial and commerce authorities remain outside template-switch ownership.

## Implementation diff evidence

Compared with Creator Station final head `dbc16e8895d47f791453b52df87f1954afbee43e`, implementation head `c2c3987598e67159cfe4b7643f1e32601b42e662` is:

- 3 commits ahead;
- 0 behind;
- 5 added files;
- 0 deletions.

Implementation files:

- `src/lib/builder/templates/spec-lab.ts`
- `tests/storefront-spec-lab-template.test.tsx`
- `public/storefront-demo/spec-lab/matrix.svg`
- `public/storefront-demo/spec-lab/system.svg`
- `public/storefront-demo/spec-lab/finder.svg`

No SQL/customer-baseline or pre-existing product/pricing/inventory/order authority file is modified.

## Implementation CI evidence

Accepted implementation head:

`c2c3987598e67159cfe4b7643f1e32601b42e662`

GitHub **CI #2048 / Actions run `34317936049`: SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1346 tests PASS**;
- TypeScript: PASS;
- GitHub production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 18 introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `c2c3987598e67159cfe4b7643f1e32601b42e662`
- ref: `feature/storefront-spec-lab-wave18`
- environment: `ci`
- release hash: `fe1b0333bee046211f9886b16520619279821256f7c779f7073c2e35007fdf98`

An earlier superseded CI run was cancelled during build because a newer branch push replaced it; quality and TypeScript had already passed. It is not treated as a product failure. The accepted implementation-head CI above is fully green.

Existing repository warnings concerning Supabase Edge-runtime APIs and older CSS autoprefixer output remain warnings only and are not introduced by Spec Lab.

## Explicit no-deploy rule

Wave 18 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging mutation;
- Supabase production mutation;
- production migration.

The GitHub `production build` gate is compilation/evidence only, not a Vercel deployment.

## Explicit non-scope

Wave 18 does not implement:

- a new Spec Lab engine;
- a second Product Configurator/System Builder;
- a second specification registry;
- a template-owned 3D engine;
- trade-in valuation authority;
- trade-in persistence;
- black-box compatibility scoring;
- silent substitution;
- guaranteed FPS/latency/performance claims;
- new price/inventory/order authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 18 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Creator Station / PR #140 and verified mergeable.
