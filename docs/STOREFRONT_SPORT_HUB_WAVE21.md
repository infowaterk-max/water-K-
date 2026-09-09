# Storefront Scale-out Wave 21 — Sport Hub

## Scope

Wave 21 opens **Sport & Outdoor #8** with **Sport Hub**, stacked directly on Loot Vault / PR #143.

- Template key: `sport.sport-hub`
- Template version: `1`
- Base branch: `feature/storefront-loot-vault-wave20`
- Exact base head: `4f31d5a8e725e0ed28c914ce84280257d7001121`
- Accepted implementation head: `97313ca7ad9a9e7178988f56394584ebd852c70f`

This wave is code-only storefront scale-out. It introduces no SQL/customer-baseline migration, production route switch, Vercel/Supabase deployment, payment change or Water-K status change.

## Portfolio position

The Sport & Outdoor family remains intentionally split into three storefront roles:

1. **Sport Hub** — broad mainstream multisport commerce hub;
2. **Trail & Expedition** — expedition/outdoor-first discovery;
3. **Performance Lab** — specialist data/spec/performance-oriented commerce.

Sport Hub therefore stays broad, approachable and energetic. It is neither an expedition shop nor a specialist performance lab.

## Activity-first shopping model

The approved primary shopping entry is locked as:

**`Milyen sportot űzöl?`**

The v1 baseline explicitly records these sport directions:

- futás;
- kerékpár;
- fitnesz;
- túra;
- úszás;
- labdajátékok.

The first discovery surface then adds the Builder-editable question:

**`Milyen szinten sportolsz?`**

with three navigation routes:

- Kezdő;
- Haladó;
- Profi.

These are navigation/merchandising entry points, not fabricated product-performance classifications. Product facts remain authoritative only when supplied by the catalog/structured product layers.

The Home contract explicitly records the required merchandising dimensions:

- sportág / aktivitás;
- kezdő / haladó / profi;
- szezonális sportok;
- felszerelés + ruházat;
- gyorsan vásárolható termékek.

This correction is intentionally built from existing shared Builder components. No Sport Hub-specific runtime or engine was added.

## Visual DNA

Character:

`clean-energetic-multisport-premium-retail`

Palette:

- warm white background `#F7F6F2`;
- cool light-grey surfaces;
- graphite text;
- sport blue primary `#1557D6`;
- signal orange accent `#F06B2B`;
- deep navy secondary `#102641`.

Typography:

- strong modern grotesk/sans display;
- clean sans interface typography.

Imagery:

- running;
- training;
- team sports;
- footwear;
- apparel;
- equipment;
- sport community.

Explicit exclusions:

- dark Performance Lab clone;
- expedition/outdoor clone;
- gamer/neon treatment;
- cheap discount-megastore styling;
- fabricated performance claims;
- fabricated team affiliation;
- fabricated event results.

## Engine contract

Required full experience:

`E1 + E2 + E7 + E10 + E13`

### E1 — Runtime

Common Page Schema/runtime/component-registry/responsive authority.

### E2 — Product Discovery

Owns catalog/search/channel eligibility and actual product visibility. Activity navigation must resolve into authoritative catalog discovery rather than a separate Sport Hub product source.

### E7 — Structured Product / Compare & Spec

Owns supplied product facts such as:

- size;
- material;
- sport/use attributes;
- level/season attributes when the merchant actually supplies them;
- technical footwear/equipment data;
- catalog facets.

The template never invents performance characteristics, skill-level suitability or seasonal applicability.

### E10 — Editorial / Story

Owns sport guides, community stories and editorial product/sport context. Editorial content does not establish official club/team affiliation or competition results.

### E13 — Checkout

Provider-neutral cart/checkout and final commerce authority.

Global authority rule:

`multisport-presentation-never-invents-performance-team-affiliation-event-results-price-stock-or-order-authority`

Merchandising contract:

- activity: E2-authoritative collection navigation;
- skill level: merchant-configured navigation and E7 facets only when supplied;
- season: E2 eligibility and E7 facets only when supplied;
- equipment/apparel: catalog segmentation over authoritative products;
- quick-buy: existing commerce components only, with no new commerce authority.

## Exact Home order

1. Sport Hub Hero
2. Shop by Sport
3. New Season
4. Footwear & Apparel
5. Equipment Essentials
6. Team & Club
7. Featured Sport
8. Community Stories
9. Guides & Advice
10. Footer

The sequence remains locked in template metadata and regression tests. The important distinction from a generic hero → cards → grids template is inside the first discovery block: activity-first entry plus Builder-native skill-level routing. `New Season` also uses the common recommendation-row presentation rather than repeating another identical full product grid.

## Product page

Desktop/tablet:

- gallery 7/12;
- buybox 5/12.

Mobile:

- gallery and buybox 12/12.

PDP includes:

- common product gallery/info;
- generic option selector;
- E7 `Méret, anyag és fő adatok`;
- standard purchase CTA;
- grouped structured product data;
- E10 Sport Note/editorial context;
- common recommendations.

Missing sport/product/performance evidence remains missing rather than being inferred.

## Page package

Sport Hub ships the standard 14 Alap-compatible Page Schema presets:

Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Minimum plan: `alap`

Demo namespace: `sport-sport-hub`

## Demo content

Namespaced collection fixtures now cover all six baseline sport entries:

- `running` — Futás;
- `cycling` — Kerékpár;
- `fitness` — Fitnesz;
- `hiking` — Túra;
- `swimming` — Úszás;
- `ball-games` — Labdajátékok.

Additional fixtures:

- product `daily-trainer`;
- product `training-layer`;
- content `sport-guide`.

Deterministic local media:

- `public/storefront-demo/sport-hub/hero.svg`
- `public/storefront-demo/sport-hub/team.svg`
- `public/storefront-demo/sport-hub/feature.svg`

Demo fixtures are regression-checked against fabricated performance guarantees, official-team claims, event results, world records and athlete certification.

## Builder compatibility and mutation boundary

Sport Hub remains native to the common Builder foundation:

- Template Manifest;
- Page Schema presets;
- shared component registry/contracts;
- common design tokens;
- desktop/tablet/mobile responsive configuration;
- allowlisted bindings;
- namespaced demo lifecycle;
- draft-only installation.

Template installation/switching may mutate storefront Page Schema drafts only. It does not mutate products, variants, customers, orders or B2B authority.

No drag/drop Visual Builder UI is introduced in this wave.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

## Correction history

Initial implementation head:

`ba48e65e635308bb4c9376ff8f9786e56981e7f5`

CI #2058 / run `34326646844` found one test-file parser defect (`TS1005: '}' expected`). It was fixed without weakening assertions, runtime validation or engine contracts.

First accepted implementation head:

`16fe8565500c90ad54aba703698463a2a67502e7`

CI #2059 / run `34326885105`: SUCCESS.

Pre-correction evidence/docs head:

`93e14981b30b0a1a2af69c8885d398bc038bab9e`

CI #2060 / run `34327164406`: SUCCESS.

A subsequent specification check found that this technically green version did not yet encode the handoff's exact activity-first question and beginner/advanced/pro merchandising axis strongly enough. The implementation was therefore corrected rather than declaring a visually generic commerce flow complete.

Activity-first implementation commit:

`55a31d3df625cd9e8f56ff9b54aefd3558de4327`

Its CI #2061 was superseded/cancelled by GitHub concurrency after the immediately following regression-test commit arrived. Before cancellation, security, baseline, quality tests and TypeScript had already passed; this was not a code failure.

Accepted corrected implementation head:

`97313ca7ad9a9e7178988f56394584ebd852c70f`

## Accepted corrected implementation CI

GitHub **CI #2062 / Actions run `34329936716`: SUCCESS** on exact head `97313ca7ad9a9e7178988f56394584ebd852c70f`.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1349 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 21 introduces no baseline migration.

Implementation release manifest:

- version: `v24`;
- SHA: `97313ca7ad9a9e7178988f56394584ebd852c70f`;
- ref: `feature/storefront-sport-hub-wave21`;
- environment: `ci`;
- release hash: `32dacce80886b74f472c04b2b11e84898571694b3160b4eac59cc850f652545b`.

The quality artifact reports 200 unique test files, 1349 total tests, 1349 passed and zero failed/pending/todo tests.

## Corrected implementation diff

Compared with Loot Vault final head `4f31d5a8e725e0ed28c914ce84280257d7001121`, accepted corrected implementation head `97313ca7ad9a9e7178988f56394584ebd852c70f` is:

- 5 commits ahead;
- 0 behind;
- 6 added files;
- 0 deleted files;
- 600 additions;
- 0 deletions.

No SQL/customer-baseline or pre-existing product/pricing/inventory/order authority file is modified.

## Explicit no-deploy rule

Wave 21 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- production migration.

GitHub `production build` is compilation/evidence only.

## Explicit non-scope

No new Sport Hub-specific engine, Performance Lab duplication, expedition UX, fabricated performance/team/event authority, new commerce authority, Visual Builder drag/drop UI, SQL/customer-baseline migration, live route switch, payment/K&H/vPOS change or Water-K status change is introduced.

## Closure rule

Wave 21 is closed only after this documentation update itself passes full CI and Draft PR #144 remains directly stacked on Loot Vault / PR #143, open, not merged and mergeable.
