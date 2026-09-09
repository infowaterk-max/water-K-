# Storefront Scale-out Wave 21 — Sport Hub

## Scope

Wave 21 opens **Sport & Outdoor #8** with **Sport Hub**, stacked directly on Loot Vault / PR #143.

- Template key: `sport.sport-hub`
- Template version: `1`
- Base branch: `feature/storefront-loot-vault-wave20`
- Exact base head: `4f31d5a8e725e0ed28c914ce84280257d7001121`
- Accepted implementation head: `16fe8565500c90ad54aba703698463a2a67502e7`

This wave is code-only storefront scale-out. It introduces no SQL/customer-baseline migration, production route switch, Vercel/Supabase deployment, payment change or Water-K status change.

## Portfolio position

The Sport & Outdoor family is intentionally split into three different storefront roles:

1. **Sport Hub** — broad multisport commerce hub;
2. **Trail & Expedition** — expedition/outdoor-first discovery;
3. **Performance Lab** — specialist, dark, data/spec/performance-oriented commerce.

Sport Hub must therefore remain broad, approachable and energetic without becoming either an expedition shop or a specialist performance lab.

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

Owns catalog/search/channel eligibility and actual product visibility.

### E7 — Structured Product / Compare & Spec

Owns real product facts such as:

- size;
- material;
- sport/use attributes;
- technical footwear/equipment data;
- catalog facets.

The template never invents performance characteristics.

### E10 — Editorial / Story

Owns sport guides, community stories and editorial product/sport context.

Editorial content does not establish official club/team affiliation or competition results.

### E13 — Checkout

Provider-neutral cart/checkout and final commerce authority.

Global authority rule:

`multisport-presentation-never-invents-performance-team-affiliation-event-results-price-stock-or-order-authority`

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

The sequence is locked in template metadata and regression tests.

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

Missing sport/product evidence remains missing rather than being inferred.

## Page package

Sport Hub ships the standard 14 Alap-compatible Page Schema presets:

Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Minimum plan: `alap`

Demo namespace: `sport-sport-hub`

## Demo content

Namespaced fixtures:

- collection `running`;
- collection `training`;
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
- shared component registry;
- responsive configuration;
- allowlisted bindings;
- namespaced demo lifecycle;
- draft-only installation.

Template installation/switching may mutate storefront Page Schema drafts only. It does not mutate products, variants, customers, orders or B2B authority.

No drag/drop Visual Builder UI is introduced in this wave.

## Implementation correction

Initial implementation head:

`ba48e65e635308bb4c9376ff8f9786e56981e7f5`

CI #2058 / run `34326646844` showed:

- security PASS;
- customer baseline guard PASS;
- **200 test files / 1349 tests PASS**;
- TypeScript FAIL only in `tests/storefront-sport-hub-template.test.tsx` with `TS1005: '}' expected`;
- production build/manifest skipped as a consequence.

The failure was a syntax/parsing defect in the minified Wave test JSX, not a runtime/engine failure. The test was rewritten into explicit formatted JSX/object structure without changing or weakening its assertions, template contract or runtime validation.

Correction commit:

`16fe8565500c90ad54aba703698463a2a67502e7`

## Accepted implementation CI

Accepted implementation head:

`16fe8565500c90ad54aba703698463a2a67502e7`

GitHub **CI #2059 / Actions run `34326885105`: SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1349 tests PASS**;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 21 introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `16fe8565500c90ad54aba703698463a2a67502e7`
- ref: `feature/storefront-sport-hub-wave21`
- environment: `ci`
- release hash: `b7d1b7d2118c1a907a9545d8449ef1d6dfc539a890dad0fcf68c08de7576962d`

Existing Supabase Edge-runtime and CSS autoprefixer warnings remain non-blocking and were not introduced by Sport Hub.

## Implementation diff

Compared with Loot Vault final head `4f31d5a8e725e0ed28c914ce84280257d7001121`, accepted implementation head is:

- 2 commits ahead;
- 0 behind;
- 5 added files;
- 0 deletions.

No SQL/customer-baseline or pre-existing commerce-authority file is modified.

## Explicit no-deploy rule

Wave 21 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- production migration.

GitHub `production build` is compilation/evidence only.

## Closure rule

Wave 21 is closed only after this documentation HEAD also passes full CI and a Draft PR is created directly on Loot Vault / PR #143 and verified mergeable.
