# Storefront Scale-out Wave 19 — Playroom

## Scope

Wave 19 opens **Gaming & Geek #7** with the broad discovery template **Playroom**.

- Template key: `gaming.playroom`
- Template version: `1`
- Base: `feature/storefront-spec-lab-wave18`
- Exact base head: `c8a3324e93964b12247308f0e870824ee8cb94fc`
- Accepted implementation head: `ee2315405f39baa8a3f9d8c2f16de46fff830ca6`

This is a code-only storefront scale-out wave. No SQL migration, production route switch, payment change, deployment, customer-baseline mutation or Water-K status change is part of the wave.

## Category separation

The Gaming & Geek family is intentionally separated into three different merchant experiences:

- **Playroom** — broad gaming/console discovery, platform-first shopping and social play;
- **Rig Forge** — technical PC build/configuration with E5/E6 compatibility;
- **Loot Vault** — collector/merch/drop-oriented storefront.

Playroom therefore does not embed a PC configurator and does not take ownership of collector-drop logic.

## Visual DNA

Character:

`playful-console-discovery-graphic-premium-social-gaming`

Palette:

- midnight indigo background;
- soft ink-violet surfaces;
- warm ivory text;
- controlled coral primary accent;
- electric cobalt secondary accent;
- limited lime tertiary accent.

Typography:

- bold rounded/geometric sans display;
- clean sans interface;
- compact sans data labels.

Visual language:

- graphic panels;
- platform tiles;
- genre rooms;
- playful geometry;
- social-play moments;
- controlled motion language.

Explicit exclusions:

- RGB/rainbow chaos;
- military-esports black/red cliché;
- childish toy-store treatment;
- fabricated release countdowns;
- fabricated review scores;
- fabricated platform compatibility;
- loot-box / gambling-style UI;
- PC-builder duplication;
- collector-vault duplication.

Core tokens:

- background `#111025`;
- surface `#191734`;
- primary `#4E46D8`;
- merchant-replaceable accent fallback `#FF6B5E`.

## Discovery path

The template locks the following shopping journey:

`Válassz platformot → Nézd meg az újdonságokat → Találd meg a játékot → Játssz együtt → Egészítsd ki`

The journey is discovery-first and uses existing shared engines rather than a gaming-only orchestration engine.

## Engine contract

Full experience:

`E1 + E2 + E3 + E6 + E7 + E10 + E13`

### E1 — Runtime

Shared Page Schema/runtime/component registry/responsive authority.

### E2 — Product Discovery

Owns catalog, search, product/channel eligibility and actual sellable product availability.

Playroom cannot surface an ineligible product as sellable.

### E3 — Guided Finder

Owns Game Finder logic over existing eligible products.

Playroom provides presentation and bindings for platform/genre/play-style questions but does not create a second Finder engine.

### E6 — Compatibility

Used only where platform/accessory compatibility is a real product fact.

Locked rules:

- Unknown is never Compatible;
- evidence remains explainable;
- server-side final validation remains authoritative;
- no silent substitution.

This is deliberately narrower than Rig Forge's configuration-centric compatibility experience.

### E7 — Structured Product / Compare & Spec

Owns structured platform, genre/player/product facts, catalog facets, Key Specs and grouped product attributes.

The template does not create a gaming-specific duplicate product-attribute registry.

### E10 — Editorial / Story

Owns Guides & Reviews editorial content.

Editorial reviews/guides are presentation content and cannot manufacture customer review scores.

### E13 — Checkout

Provider-neutral cart/checkout and final commerce authority.

Global authority rule:

`discovery-never-invents-release-date-rating-review-score-platform-support-price-stock-or-order-authority`

## Home composition

1. Playroom Hero
2. Shop by Platform
3. New & Noteworthy
4. Game Finder
5. Play Together
6. Genre Rooms
7. Accessories by Platform
8. Platform Match
9. Editor’s Picks
10. Guides & Reviews
11. Footer

### Playroom Hero

Uses the shared `editorial.hero` component with local deterministic demo artwork.

### Shop by Platform

Uses shared collection navigation. Platform groupings are commerce/catalog content rather than hardcoded brand-specific console authority.

### New & Noteworthy

Uses the common product grid with E2 eligibility.

No fake release date or countdown is supplied by demo data.

### Game Finder

Uses `guided.finder` from E3.

### Play Together

Editorial discovery surface for social/co-op-style shopping. It is not a claim that a product supports multiplayer; actual product facts remain E7 data.

### Genre Rooms

Uses shared guided attribute navigation bound to catalog data.

### Accessories by Platform

Uses the common recommendation row. Recommendations do not establish compatibility by themselves.

### Platform Match

Uses E6 status + criterion-level evidence. Unknown remains Unknown.

### Editor’s Picks

Common product grid; editorial curation never overrides E2 product eligibility.

### Guides & Reviews

Uses shared editorial journal presentation from E10-owned content.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- both: 12/12.

PDP contains:

- product gallery;
- product info / live commerce values;
- generic option selector;
- E7 Key Specs;
- real review summary binding through `reviews.summary.*`;
- purchase CTA;
- grouped structured product data;
- E6 compatibility status/evidence;
- product recommendations.

Review fallback is `0 / 0`; the template does not fabricate a positive rating.

## Catalog and search

Catalog combines:

- collection header;
- guided platform/genre navigation;
- E7 structured facets;
- common product grid.

Search combines:

- E3 guided-result surface;
- E2 search results;
- E7 structured context.

## Content preset

Content role:

`game-finder-and-guides`

Engine binding:

`E3+E10`

It composes the reusable Finder/result experience with editorial guidance without adding new persistence.

## Page package

Playroom ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Game Finder + Guides
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan: `alap`

Demo namespace: `gaming-playroom`

No core Playroom engine is artificially Pro-gated.

## Demo fixtures and media

Namespaced demo fixtures:

- collection `console-games`;
- collection `play-together`;
- product `playroom-adventure`;
- product `playroom-controller`;
- content `platform-guide`.

Deterministic local demo media:

- `public/storefront-demo/playroom/hero.svg`
- `public/storefront-demo/playroom/platforms.svg`
- `public/storefront-demo/playroom/together.svg`

Fixtures intentionally omit release dates, ratings, compatibility truth, platform-support truth, countdowns, loot-box odds and guarantees.

## Builder compatibility

Playroom remains inside the common Builder foundation:

- Template Manifest;
- Page Schema presets;
- shared component registry;
- component-key/version rendering;
- responsive configuration;
- allowlisted Binding Layer;
- namespaced demo lifecycle;
- draft-only installation.

No merchant-facing drag/drop editor is introduced in this wave.

## Install mutation boundary

Template installation/switching may materialize storefront Page Schema drafts only.

It does not mutate:

- products;
- variants;
- customers;
- orders;
- B2B authority;
- pricing/inventory authority;
- Finder configuration;
- compatibility truth;
- review evidence.

## Implementation diff

Compared with exact Spec Lab final head `c8a3324e93964b12247308f0e870824ee8cb94fc`, accepted implementation head `ee2315405f39baa8a3f9d8c2f16de46fff830ca6` is:

- 1 commit ahead;
- 0 behind;
- 5 added files;
- 0 deletions.

Implementation files:

- `src/lib/builder/templates/playroom.ts`
- `tests/storefront-playroom-template.test.tsx`
- `public/storefront-demo/playroom/hero.svg`
- `public/storefront-demo/playroom/platforms.svg`
- `public/storefront-demo/playroom/together.svg`

No SQL/customer-baseline or pre-existing product/pricing/inventory/order authority file is modified.

## Implementation CI evidence

Implementation head:

`ee2315405f39baa8a3f9d8c2f16de46fff830ca6`

GitHub **CI #2051 / Actions run `34319278306`: SUCCESS**.

Verified:

- security audit: PASS;
- customer baseline guard: PASS;
- quality: **200 test files / 1347 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because this wave introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `ee2315405f39baa8a3f9d8c2f16de46fff830ca6`
- ref: `feature/storefront-playroom-wave19`
- environment: `ci`
- release hash: `db7ef39a8fa83e475d1857e1cd8a7dc4cd1e5e9f5fb4877d60cc2d9556978c6d`

Existing Supabase Edge-runtime and CSS autoprefixer messages remain warnings only and are not introduced by Playroom.

## Explicit no-deploy rule

Wave 19 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- production migration.

GitHub `production build` is compilation/evidence only.

## Non-scope

Wave 19 does not implement:

- a new gaming engine;
- PC configurator duplication;
- collector/drop authority;
- loot-box/gambling mechanics;
- fake launch countdowns;
- fake reviews or ratings;
- fake platform compatibility;
- new product/spec registry;
- new price/inventory/order authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live route switch;
- payment/K&H/vPOS changes;
- Water-K status change.

## Closure rule

Wave 19 is closed only when this documentation HEAD also passes full CI and the new PR is created as a Draft stacked directly on Spec Lab / PR #141 and verified mergeable.
