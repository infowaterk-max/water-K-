# Storefront Scale-out Wave 28 — Heritage Atelier Re-acceptance

## Scope

Wave 28 does **not** create a second Heritage Atelier template. `jewelry.heritage-atelier` v1 was already implemented earlier as Golden #3 together with E10 — Editorial / Story Engine v1 and is inherited by the current stacked baseline.

Wave 28 performs a **current-baseline re-acceptance** against the now-established Jewelry & Accessories family:

1. Modern Luxe — modern, spacious, premium luxury retail
2. Heritage Atelier — craftsmanship, provenance and editorial story-led luxury
3. Statement Lab — contemporary material/spec gallery and object lab

Branch:

`feature/storefront-heritage-atelier-wave28`

Exact base:

- base branch: `feature/storefront-modern-luxe-wave27`
- base SHA: `bd754ef1193daaee34b5f3b7fc87c650c53a0c20`
- base PR: #150

Accepted implementation/re-acceptance head:

`19027088547455bcfffff2c1f53c61d637dada01`

## Inherited implementation

Historical Heritage Atelier branch:

`feature/storefront-heritage-atelier-wave3`

Historical final evidence head:

`3b8e1853ae92237e8cc72ca7e7f348446d5259f5`

The inherited implementation already includes:

- `jewelry.heritage-atelier` v1;
- E10 Editorial / Story Engine v1;
- structured Story Documents;
- maker/origin/process/journal/lookbook/before-after story types;
- Story relations;
- verified provenance validation;
- Story publishing lifecycle;
- safe structured story blocks;
- reusable Story storefront components;
- 14 Alap-compatible Page Schema presets;
- draft-only namespaced installation.

Wave 28 therefore adds current-family acceptance and regression evidence instead of duplicating the template or E10.

## Visual direction

Heritage Atelier remains:

`heritage-luxury-craftsmanship-provenance-editorial-commerce`

Accepted visual character:

- heritage luxury × craftsmanship × provenance × editorial commerce;
- warm ivory / parchment background;
- deep charcoal text;
- burgundy and antique brass accents;
- muted stone secondary tones;
- heritage editorial serif display typography;
- clean sans-serif UI typography;
- macro material / workshop / craft imagery;
- generous editorial whitespace;
- restrained provenance-luxury chrome.

Builder font requirements recorded by Wave 28:

- Builder-available;
- legally usable;
- Hungarian-character support.

Merchant accent remains tokenized through `--merchant-accent`.

## Jewelry-family separation

### Modern Luxe

Modern Luxe owns the spacious modern campaign/luxury-retail direction.

Heritage Atelier must not collapse into a sparse campaign shop with story elements added as decoration.

### Heritage Atelier

Heritage Atelier owns the narrative rhythm:

`story → provenance → craft → commerce → journal → care`

Story and provenance are structural parts of the shopping experience rather than visual ornament.

### Statement Lab

Statement Lab owns the contemporary material/spec/object-lab direction and required E7 compare/spec emphasis.

Heritage Atelier may consume supplied E7 material/spec facts, but its primary authority and identity remain E10 editorial/provenance, not technical comparison.

## E10 Story authority

Engine:

`shoporation.editorial-story-engine.v1`

Required shared engines for full Heritage Atelier experience:

- E1 Runtime
- E2 Product Discovery
- E10 Editorial / Story
- E13 Checkout

Useful optional engine:

- E7 Compare & Spec for supplied structured material/size/spec facts.

Supported E10 story types:

- lookbook
- maker
- journal
- origin
- process
- before-after

Story blocks remain structured. Arbitrary raw HTML, scripts, iframes or executable blocks are not part of the Story contract.

## Provenance fail-closed contract

A provenance claim may render only when it references an explicit `origin` relation whose `verified` value is `true`.

Unverified or missing origin evidence produces:

`STORY_PROVENANCE_UNVERIFIED`

Wave 28 adds fresh regression proof for this rule.

The Heritage Home provenance component also remains empty by default:

- `claims: []`
- binding: `story.provenance.claims`

The template therefore does not manufacture origin evidence in Page Schema.

## Story vs product authority

E10 relations may identify and navigate to products, collections, makers, stories and origins, but Story relations must never own or duplicate:

- price;
- stock;
- inventory;
- SKU;
- variants;
- compare-at price;
- customer pricing;
- order data.

Wave 28 adds fresh regression evidence that relation payloads attempting to smuggle pricing authority fail with:

`STORY_PRODUCT_AUTHORITY_DUPLICATED`

Commerce truth remains:

- price = pricing binding only;
- stock = inventory binding only;
- variants = variant binding only;
- material/size/spec = E7 or authoritative product binding only when supplied;
- checkout = provider-neutral E13.

No template-specific jewelry product authority is introduced.

## Story lifecycle

Inherited E10 lifecycle remains:

- draft — preview only;
- published — requires valid UTC `publishedAt` and renders only after that instant;
- archived — hidden normally, preview only.

Invalid Story Documents do not produce a read model.

## Template-switch persistence

Story Documents remain independent content authority.

Template switching may materialize storefront Page Schema drafts but must not mutate:

- Story Documents;
- products;
- collections;
- makers;
- orders;
- customers.

The locked mutation boundary remains:

- `storyDocuments: false`
- `products: false`
- `collections: false`
- `makers: false`
- `orders: false`
- `customers: false`
- `storefrontPageDrafts: true`

## Shared Builder/story surfaces

Inherited shared Story surfaces:

- `story.hero`
- `story.feature`
- `story.provenance`
- `story.timeline`
- `story.body`
- `story.index`
- `story.service-care`

There is no runtime `jewelry.heritage-atelier` conditional rendering branch.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Responsive modes remain:

- Desktop
- Tablet
- Mobile

Business copy, price, provenance claims, maker claims and CTA must not be baked into image assets.

## Exact Home order

1. Heritage Hero
2. Featured Collection Story
3. Craftsmanship Feature
4. Product Selection
5. Maker/Atelier Story
6. Material & Origin
7. Timeline/Heritage
8. Editorial Commerce Grid
9. Journal
10. Service/Care
11. Footer

This eleven-stage narrative is deliberately unlike Modern Luxe's sparse campaign-commerce flow and Statement Lab's object/spec gallery rhythm.

## Product page

Inherited PDP layout remains:

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- gallery: 12/12
- buybox: 12/12

The PDP composes:

- product gallery;
- authoritative product/pricing/inventory bindings;
- generic option selector;
- E7-compatible key specs when supplied;
- purchase CTA;
- E10 story context;
- verified provenance surface;
- recommendations.

E10 does not replace E7 or product authority.

## Page package

Heritage Atelier continues to ship all 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Story detail
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Demo namespace remains:

`jewelry-heritage-atelier`

Installation remains draft-only and cannot mutate products, variants, customers, orders or B2B records.

## 3D / AR boundary

3D/AR is **not required by Heritage Atelier v1**.

It remains a possible future shared Pro/Add-on capability whose final packaging is deferred. Wave 28 does not introduce a Heritage-specific 3D/AR engine.

Any future 3D/AR feature must compose with shared capability architecture and must not become provenance or product truth authority.

## Wave 28 evidence files

New files:

- `src/lib/builder/templates/heritage-atelier-wave28-acceptance.ts`
- `tests/storefront-heritage-atelier-wave28-reacceptance.test.tsx`

The inherited `heritage-atelier.ts`, E10 engine and Story renderer are deliberately reused rather than duplicated.

## Accepted implementation CI

Accepted re-acceptance head:

`19027088547455bcfffff2c1f53c61d637dada01`

GitHub **CI #2104 / Actions run `34344143223`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 unique test files / 1355 tests PASS**;
- 1355 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 28 introduces no migration.

Implementation release manifest:

- version: `v24`;
- SHA: `19027088547455bcfffff2c1f53c61d637dada01`;
- ref: `feature/storefront-heritage-atelier-wave28`;
- environment: `ci`;
- release hash: `83d0c0cf174f9b2093afdb34b373319ec143db17d213b0aa46b849bb91bf0dc9`.

## Implementation diff vs Wave 27 final head

Compared with `bd754ef1193daaee34b5f3b7fc87c650c53a0c20` before this documentation commit:

- 2 commits ahead;
- 0 behind;
- 2 added files;
- 219 additions;
- 0 deletions.

## Explicit no-deploy rule

Wave 28 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K pilot status change.

GitHub `production build` remains compilation/evidence only.

## Closure rule

Wave 28 closes only when:

1. this documentation HEAD passes full current-head GitHub CI;
2. final test totals and final release hash are independently recorded;
3. final diff is verified against Wave 27 final head;
4. a Draft PR is stacked directly on `feature/storefront-modern-luxe-wave27` / PR #150;
5. that PR is open, not merged and mergeable/clean.
