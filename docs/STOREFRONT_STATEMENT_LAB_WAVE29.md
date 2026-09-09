# Storefront Scale-out Wave 29 — Statement Lab Re-acceptance

## Scope

Wave 29 does **not** create a second Statement Lab template. `jewelry.statement-lab` v1 was already implemented earlier as Wave 11 and is inherited by the current stacked baseline.

Wave 29 performs a **current-baseline re-acceptance** against the complete Jewelry & Accessories family:

1. Modern Luxe — spacious modern premium luxury retail
2. Heritage Atelier — craftsmanship/provenance/editorial story-led luxury
3. Statement Lab — contemporary object gallery × material/spec lab

Branch:

`feature/storefront-statement-lab-wave29`

Exact base:

- base branch: `feature/storefront-heritage-atelier-wave28`
- base SHA: `533e37870ad2ced51fa18f4680d6a186ff39467d`
- base PR: #151

Accepted implementation/re-acceptance head:

`5013d8becc021972d553de9394ed8b4184b89a2a`

## Inherited implementation

Historical branch:

`feature/storefront-statement-lab-wave11`

The inherited implementation already contains:

- `jewelry.statement-lab` v1;
- 14 Alap-compatible Page Schema presets;
- shared E1/E2/E7/E13 integration;
- layered asymmetric opening;
- E7 material/specification surfaces;
- E7 Form Compare;
- structured catalog/search facets;
- 7/12 + 5/12 PDP;
- technical/material/care document surface;
- provider-neutral checkout;
- draft-only namespaced installation.

Wave 29 therefore adds fresh current-family acceptance evidence rather than rewriting or duplicating the template.

## Visual direction

Statement Lab remains:

`contemporary-design-jewelry-gallery-material-lab`

Accepted visual character:

- off-white gallery background;
- silver-grey surfaces;
- graphite typography;
- exactly one merchant accent;
- supported accent directions: oxidized red, acid yellow or cobalt;
- grotesk display typography;
- clean sans-serif UI typography;
- optional monospaced specification accent;
- large object photography;
- macro material studies;
- asymmetric, precise gallery-like spacing.

Builder font requirements:

- Builder-available;
- legally usable;
- Hungarian-character support.

Merchant accent remains tokenized through `--merchant-accent`.

Single-accent rule:

`single-accent-only-no-competing-neon-or-luxe-gold-stack`

## Jewelry-family separation

### Modern Luxe

Statement Lab must not become champagne-gold, spacious campaign-luxury retail.

### Heritage Atelier

Statement Lab must not become provenance/craftsmanship/story-led heritage luxury.

### Statement Lab

Own rhythm:

`object index → material study → statement grid → object detail`

The primary language is contemporary object/form/material analysis rather than heritage narrative or campaign luxury.

## Builder compatibility

The inherited Asymmetric Opening uses shared visual primitives:

- `visual.layered-canvas`
- `visual.layer`

Independent opening layers:

1. object image
2. object/index label
3. display title
4. supporting copy

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Responsive modes remain:

- Desktop
- Tablet
- Mobile

Image rule:

business copy, price, material/manufacturing claims, specifications and CTA must never be baked into image assets.

## Exact Home order

1. Asymmetric Opening
2. Floating Product Index
3. Material Study
4. Statement Grid
5. Object Detail
6. Footer

This remains intentionally shorter, more gallery-like and more object-focused than Modern Luxe or Heritage Atelier.

## Engine and authority contract

Required shared engines:

- E1 Runtime
- E2 Product Discovery
- E7 Compare & Spec
- E13 Checkout

No new Statement Lab-specific engine is introduced.

### Product truth

Fail-closed ownership:

- price = pricing binding only;
- stock = inventory binding only;
- variants = variant binding only;
- material facts = E7 or authoritative product binding only when supplied;
- manufacturing/making facts = E7 or authoritative product binding only when supplied;
- technical/material/care documents = authoritative product document binding only;
- checkout = provider-neutral E13.

Statement Lab may present object facts but must never author or infer them.

### E7 surfaces

E7 surfaces remain read-model/presentation only:

- `commerce.key-specs`
- `commerce.specification-groups`
- `commerce.compare-button`
- `commerce.compare-table`
- `commerce.compare-spotlight`
- `commerce.catalog-facets`
- `commerce.technical-documents`

`Object Specification` and `Form Compare` therefore do not create a second material/specification/comparison authority.

## Empty-by-default evidence

Wave 29 fresh regression proves that structured E7 surfaces remain empty by default rather than inventing object facts:

- Home Material Study `items: []`;
- PDP key specs `items: []`;
- PDP specification groups `groups: []`;
- Form Compare products/groups empty by default;
- technical documents empty by default.

No default material, weight, finish, dimensions, making method or comparison value is treated as product truth.

## PDP

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- gallery: 12/12
- buybox: 12/12

Inherited structure includes:

- authoritative product information;
- generic option selector;
- E7 Object Specification key specs;
- Form Compare CTA;
- purchase CTA;
- grouped Object Specification;
- E7 Form Compare table;
- technical/material/care documents.

Unsafe option URLs and unavailable options remain governed by shared runtime behavior.

## Catalog and search

Catalog/search continue to combine E2 discovery with E7 structured facets rather than introducing a template-local filter engine.

Responsive facet/results contract remains inherited from v1.

## Page package

Statement Lab continues to expose all 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Form Compare
9. Blog Index / Studies
10. Blog Article / Study
11. FAQ
12. Contact
13. Legal
14. Not Found

Demo namespace remains:

`jewelry-statement-lab`

Installation remains draft-only and cannot mutate:

- products;
- variants;
- customers;
- orders;
- B2B records.

## 3D / AR boundary

3D/AR is **not required by Statement Lab v1**.

It remains a possible future shared Pro/Add-on capability whose packaging is deferred. Wave 29 does not introduce a Statement Lab-specific 3D/AR engine.

Any future 3D/AR feature must compose with shared capability architecture and must never own or infer material/product truth.

## Wave 29 evidence files

New files:

- `src/lib/builder/templates/statement-lab-wave29-acceptance.ts`
- `tests/storefront-statement-lab-wave29-reacceptance.test.tsx`

The inherited `src/lib/builder/templates/statement-lab.ts`, E7 engine and shared renderers remain reused rather than duplicated.

## Accepted implementation CI

Accepted re-acceptance head:

`5013d8becc021972d553de9394ed8b4184b89a2a`

GitHub **CI #2108 / Actions run `34345200085`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 unique test files / 1356 tests PASS**;
- 1356 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 29 introduces no migration.

Implementation release manifest:

- version: `v24`;
- SHA: `5013d8becc021972d553de9394ed8b4184b89a2a`;
- ref: `feature/storefront-statement-lab-wave29`;
- environment: `ci`;
- release hash: `07c4d74e6009d483e490543cd9f19a064895181af363a522d6d20930422a3f71`.

## Implementation diff vs Wave 28 final head

Compared with `533e37870ad2ced51fa18f4680d6a186ff39467d` before this documentation commit:

- 2 commits ahead;
- 0 behind;
- 2 added files;
- 214 additions;
- 0 deletions.

No SQL/customer-baseline, pricing, inventory, order, payment, deployment or shared runtime/E7 authority implementation file is changed.

## Release checkpoint boundary

Wave 29 is the final template wave before the agreed controlled production checkpoint.

After final Wave 29 current-head CI and Draft PR closure:

1. stop template scale-out;
2. identify the exact stacked integration chain from current `main`;
3. integrate in dependency order;
4. run a consolidated release-candidate CI/evidence gate;
5. deploy a controlled production candidate;
6. smoke-test current Water-K pilot functionality and the storefront runtime;
7. establish a new production baseline before Wave 30.

## Explicit no-deploy rule for the Wave itself

Wave 29 does not itself trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K pilot status change.

Those actions belong only to the subsequent controlled Release Checkpoint.

## Closure rule

Wave 29 closes only when:

1. this documentation HEAD passes full current-head GitHub CI;
2. final test totals and final release hash are independently recorded;
3. final diff is verified against Wave 28 final head;
4. a Draft PR is stacked directly on `feature/storefront-heritage-atelier-wave28` / PR #151;
5. that PR is open, not merged and mergeable/clean.
