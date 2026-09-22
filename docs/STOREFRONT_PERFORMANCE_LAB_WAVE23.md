# Storefront Scale-out Wave 23 — Performance Lab

## Scope

Wave 23 adds **Performance Lab** as the third Sport & Outdoor storefront direction, stacked directly on Trail & Expedition / PR #145.

- Template key: `sport.performance-lab`
- Template version: `1`
- Base branch: `feature/storefront-trail-expedition-wave22`
- Exact base head: `5d33e337ffd8c8e92f3c1beb318d7509190b15fb`
- Branch: `feature/storefront-performance-lab-wave23`
- Accepted implementation head: `97df31aef8178ce523b1e940061908ebeec247dc`

This is a code-only storefront scale-out wave. It does not authorize a Vercel deploy, Supabase mutation, SQL migration, payment/K&H/vPOS change, main merge or Water-K status change.

## Previously approved direction carried forward

The approved Performance Lab direction is:

- primary entry question: **`Mi a célod?`**;
- dark navy / graphite performance-lab UI;
- electric blue + green accents;
- specification cards;
- Gear Finder;
- Lab Tested graph/data presentation;
- highlighted comparison;
- video / expert content;
- limited lifestyle emphasis;
- performance-dashboard / sport-lab visual logic, but in a Shoporation-specific composition rather than copying a reference layout.

A hard portfolio constraint is that Performance Lab must be **structurally and visually very different** from Trail & Expedition. It is not sufficient to change only diamonds, slants or palette.

The exact Wave 23 section composition, token values and the four default goal labels below are implementation decisions that support that approved direction; they are not represented as previously approved pixel-level details.

## Portfolio position

Sport & Outdoor now has three separate roles:

1. **Sport Hub** — broad mainstream multisport commerce hub;
2. **Trail & Expedition** — route/adventure-first trail, trekking and camping commerce;
3. **Performance Lab** — specialist goal/spec/compare performance commerce.

Performance Lab excludes:

- Trail cinematic/editorial route structure;
- Diamond/Slant selector reuse;
- Sport Hub mainstream retail rhythm;
- generic hero → card → repeated-grid structure;
- gamer-neon visual treatment;
- fabricated lab/performance authority.

## Shopping entry / Goal Console

Primary question:

**`Mi a célod?`**

Wave 23 v1 default goal labels:

1. Gyorsaság
2. Állóképesség
3. Erő
4. Technika

These labels are merchant-configurable navigation defaults. A goal selection by itself does **not** establish that a product is suitable for that goal.

Goal Console contract:

- presentation: `dashboard-goal-console`;
- selection: merchant-configured navigation;
- product suitability requires supplied authoritative data;
- no stateful goal/fitness inference is introduced.

## Visual DNA

Character:

`dark-technical-performance-dashboard-lab`

Implementation palette:

- deep navy background `#07111F`;
- graphite panel `#0E1B2B`;
- raised panel `#14263A`;
- lab white `#F5F8FB`;
- electric blue `#2F80ED`;
- signal green `#45E08C`;
- cool cyan `#6ED0FF`.

Imagery direction:

- product detail;
- testing/instrumentation;
- expert review;
- controlled studio;
- technical dashboards;
- minimal lifestyle.

## Engine contract

Required full experience:

`E1 + E2 + E7 + E10 + E13`

### E1 — Runtime

Shared Page Schema, component registry, binding and responsive runtime authority.

### E2 — Product Discovery

Owns catalog/search/channel eligibility and actual product visibility. Goal selection and Gear Finder presentation resolve toward authoritative catalog discovery.

### E7 — Structured Product / Compare & Spec

Owns structured specifications, supplied measurements and comparison facts. Performance Lab never invents or infers missing measurement values, rankings, deltas, performance gains or suitability.

### E10 — Editorial / Story

Owns expert/video content, Research Notes and Lab Tested editorial context. Editorial content does not become performance proof or endorsement authority automatically.

### E13 — Checkout

Provider-neutral cart/checkout and final commerce authority.

Global authority rule:

`performance-lab-presentation-never-invents-test-results-performance-gains-fitness-suitability-endorsements-price-stock-or-order-authority`

## Gear Finder boundary

The shared repository foundation still does not prove a reusable stateful Guided Finder UI contract suitable for a template-specific state machine.

Therefore Wave 23 v1 does **not** create a Performance-Lab-specific Guided Finder engine.

The Goal Console and Gear Finder are declarative discovery/presentation over E2 and E7. A future stateful Gear Finder must compose with the shared Guided Finder architecture when that common engine is available.

## Lab Tested / graph boundary

There is no separate common chart component in the current shared Builder registry.

Wave 23 therefore uses:

- E7 key-spec / compare structures for actual supplied data;
- Builder-editable Lab Tested editorial content;
- a deterministic local chart visual as presentation fallback.

Rules:

- metric cards/charts may render only source-supplied measurements, labels, units and comparisons;
- missing axis values are not inferred;
- missing deltas are not inferred;
- rankings are not generated from absent authority;
- performance gain claims are never fabricated;
- chart imagery alone is not a test result.

## Exact Home order

1. Performance Lab Hero
2. Goal Console
3. Metric Snapshot
4. Gear Finder
5. Compare Spotlight
6. Lab Tested
7. Expert Review
8. Research Notes
9. Footer

This dashboard rhythm deliberately differs from Trail & Expedition's route/editorial flow and Sport Hub's mainstream merchandising flow.

## Product page

Desktop/tablet:

- gallery 6/12;
- technical buybox 6/12.

Mobile:

- gallery and buybox 12/12.

PDP composition:

- shared gallery;
- product info;
- variant selector;
- E7 Performance Specs;
- compare CTA;
- purchase CTA;
- detailed specification groups;
- compare table;
- Lab Note;
- related gear.

Missing facts remain missing.

## Page package

The package ships all 14 Alap-compatible Page Schema presets:

Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal, Not Found.

Minimum plan: `alap`

Demo namespace: `sport-performance-lab`

## Demo fixtures

Namespaced goal collections:

- `speed-goal` — Gyorsaság;
- `endurance-goal` — Állóképesség;
- `strength-goal` — Erő;
- `technique-goal` — Technika.

Additional demo fixtures:

- `lab-runner`;
- `training-sensor`;
- `research-note`.

Deterministic local media:

- `public/storefront-demo/performance-lab/hero.svg`;
- `public/storefront-demo/performance-lab/chart.svg`;
- `public/storefront-demo/performance-lab/expert.svg`.

No fixture establishes a real test result, performance gain, fitness suitability, athlete endorsement, ranking or guaranteed performance.

## Builder compatibility

Wave 23 remains native to the common Builder foundation:

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

## Accepted implementation CI

Accepted implementation head:

`97df31aef8178ce523b1e940061908ebeec247dc`

GitHub **CI #2078 / Actions run `34336997495`: SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1351 tests PASS**;
- 1351 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 23 introduces no baseline migration.

Implementation release manifest:

- version: `v24`;
- SHA: `97df31aef8178ce523b1e940061908ebeec247dc`;
- ref: `feature/storefront-performance-lab-wave23`;
- environment: `ci`;
- release hash: `91d0fd86a74bb1bb1360573ed2ba274c24759b6d1b1de84bd320f453bb171afb`.

## Implementation diff

Compared with Trail & Expedition final head `5d33e337ffd8c8e92f3c1beb318d7509190b15fb`, accepted implementation head is:

- 6 commits ahead;
- 0 behind;
- 6 added files;
- 0 deleted files;
- 509 additions;
- 0 deletions.

No SQL/customer-baseline or pre-existing product/pricing/inventory/order/payment authority file is modified.

## Explicit no-deploy rule

Wave 23 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration.

GitHub production build remains compilation/evidence only.

## Closure rule

Wave 23 closes only when:

1. this final documentation HEAD passes full current-head GitHub CI;
2. a Draft PR is stacked directly on `feature/storefront-trail-expedition-wave22` / PR #145;
3. that PR is open, not merged and mergeable.
