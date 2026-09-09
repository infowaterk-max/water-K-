# Storefront Scale-out Wave 22 — Trail & Expedition

## Scope

Wave 22 adds **Trail & Expedition** as the second Sport & Outdoor storefront direction, stacked directly on Sport Hub / PR #144.

- Template key: `sport.trail-expedition`
- Template version: `1`
- Base branch: `feature/storefront-sport-hub-wave21`
- Exact base head: `2b796958557ca896277b0bfeca56b7ab3fb56694`
- Branch: `feature/storefront-trail-expedition-wave22`

This is a code-only storefront scale-out wave. It does not authorize a Vercel deploy, Supabase mutation, SQL migration, payment/K&H/vPOS change, main merge or Water-K status change.

## Portfolio position

Sport & Outdoor remains split into three deliberately different roles:

1. **Sport Hub** — broad mainstream multisport commerce hub;
2. **Trail & Expedition** — route/adventure-first trail, trekking and camping commerce;
3. **Performance Lab** — specialist goal/data/spec/performance-oriented commerce.

Trail & Expedition must not become a recolored Sport Hub or a dark Performance Lab.

## Shopping entry

The primary question is:

**`Hová indulsz?`**

The approved v1 adventure routes are:

1. Egynapos túra
2. Hétvégi trekking
3. Kemping
4. Trail run
5. Téli kaland
6. Családi kiruccanás

This is a route/adventure discovery entry, not a safety, difficulty, weather or fitness-suitability authority.

## Diamond / Slant Adventure Selector

The selector contract is explicitly recorded in template metadata:

- geometry: `diamond-slant`;
- default state: `muted-desaturated`;
- active state: `color-detail-cta`;
- desktop interaction: `hover-focus`;
- mobile interaction: `tap-carousel`.

Wave 22 v1 uses the existing shared collection-navigation component as the runtime discovery surface. The slant/diamond visual behavior remains Builder presentation metadata rather than introducing an indivisible one-off component or new commerce authority.

## Guided Finder boundary

The current repository foundation documentation treats the Product Discovery / Guided Finder engine family as a later launch requirement rather than proof of an already implemented reusable Guided Finder UI.

Therefore Wave 22 v1 does **not** create a Trail-specific stateful Guided Finder.

Its route selector and Gear Checklist are declarative navigation/editorial presentation over existing authority layers. A later stateful trip planner must compose with the common Guided Finder contract when that shared engine is actually available.

## Visual DNA

Character:

`dark-cinematic-route-first-outdoor-editorial`

Implementation palette:

- forest-charcoal background `#111714`;
- dark stone surface `#1D2621`;
- muted forest surface `#29342E`;
- mist-white text `#F2F2EA`;
- pine primary `#315C43`;
- trail amber accent `#D69A46`;
- slate secondary.

The exact token values above are a Wave 22 implementation choice supporting the previously approved dark/cinematic direction; they are not represented as an earlier pixel-level visual approval.

Imagery direction:

- trail;
- ridge;
- camp;
- winter;
- forest;
- family outdoor;
- field notes;
- route/editorial context.

Explicit exclusions:

- Sport Hub mainstream clone;
- Performance Lab data clone;
- generic hero → cards → product-grid clone;
- fabricated route safety;
- fabricated weather suitability;
- fabricated difficulty;
- fabricated survival/fitness suitability.

## Engine contract

Required full experience:

`E1 + E2 + E7 + E10 + E13`

### E1 — Runtime

Shared Page Schema, component registry, binding and responsive runtime authority.

### E2 — Product Discovery

Owns catalog/search/channel eligibility and actual product visibility. Adventure selections resolve toward authoritative catalog discovery rather than a separate Trail product source.

### E7 — Structured Product / Compare & Spec

Owns only supplied product facts such as material, size, season/use attributes and equipment specifications. Trail & Expedition never infers weather suitability, route suitability, safety or performance from missing data.

### E10 — Editorial / Story

Owns Gear Checklist, Field Notes, Outdoor Guides and route/editorial context. Editorial copy does not establish product compatibility, checklist completeness, route safety, weather, difficulty or navigation authority.

### E13 — Checkout

Provider-neutral cart/checkout and final commerce authority.

Global authority rule:

`outdoor-presentation-never-invents-route-safety-weather-difficulty-fitness-suitability-performance-price-stock-or-order-authority`

## Exact Home order

1. Trail & Expedition Hero
2. Adventure Selector
3. Gear Checklist
4. Adventure Kits
5. Route / Map Feature
6. Trail Essentials
7. Field Notes
8. Outdoor Guides
9. Footer

This makes the storefront structurally different from Sport Hub: route/adventure discovery, editorial checklist, a focused kit rail and route/map editorial context precede the single secondary essentials product grid.

## Route / Map boundary

The Route / Map Feature uses static/editorial content and deterministic demo media. It is explicitly **not**:

- live navigation;
- live GPS routing;
- weather data;
- route safety authority;
- difficulty certification.

## Product page

Desktop/tablet:

- gallery 7/12;
- buybox 5/12.

Mobile:

- gallery and buybox 12/12.

The PDP uses:

- shared product gallery/info;
- generic option selector;
- E7 key specs;
- shared purchase CTA;
- grouped structured facts;
- E10 Field Note;
- shared recommendations.

Missing facts remain missing.

## Page package

The package ships all 14 Alap-compatible Page Schema presets:

Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Minimum plan: `alap`

Demo namespace: `sport-trail-expedition`

## Demo fixtures

Namespaced adventure collections:

- `day-hike` — Egynapos túra;
- `weekend-trekking` — Hétvégi trekking;
- `camping` — Kemping;
- `trail-run` — Trail run;
- `winter-adventure` — Téli kaland;
- `family-outing` — Családi kiruccanás.

Additional demo fixtures:

- `trail-shell`;
- `camp-kit`;
- `field-note`.

Deterministic local media:

- `public/storefront-demo/trail-expedition/hero.svg`;
- `public/storefront-demo/trail-expedition/map.svg`;
- `public/storefront-demo/trail-expedition/field.svg`.

No demo fixture establishes route safety, weather, difficulty, fitness suitability, survival or performance claims.

## Builder compatibility

Wave 22 remains native to the common Builder foundation:

- Template Manifest;
- 14 Page Schema presets;
- shared component contracts;
- common design-token contract;
- desktop/tablet/mobile responsive config;
- allowlisted bindings;
- namespaced demo lifecycle;
- draft-only installation.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

No drag/drop Visual Builder UI is added.

## Mutation boundary

Template installation/switching may write storefront Page Schema drafts only. It may not mutate products, variants, customers, orders, B2B data, payment authority or production configuration.

## Explicit no-deploy rule

Wave 22 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration.

GitHub production build remains compilation/evidence only.

## Closure rule

Wave 22 closes only when:

1. full current-head GitHub CI is green;
2. implementation evidence and release hash are recorded;
3. the final documentation HEAD also passes full CI;
4. a Draft PR is stacked directly on `feature/storefront-sport-hub-wave21` / PR #144;
5. that PR is open, not merged and mergeable.
