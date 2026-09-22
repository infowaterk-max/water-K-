# Storefront Scale-out Wave 9 — Street Drop

## Purpose

Wave 9 starts the post-Golden 34-template scale-out with **Street Drop**.

Template key: `fashion.street-drop`

Street Drop does **not** introduce a new commerce engine. It consumes the shared storefront runtime and authorities already established by the Golden waves.

## Dependency

Base Wave 8 / PR #129 final head:

`64b8cfafda346ed6c84f679c4c81aaaf9b4f7e1d`

Wave 9 branch:

`feature/storefront-street-drop-wave9`

The PR must remain stacked on Wave 8 and Draft until the lower dependency chain lands in order.

## Accepted visual direction

Street Drop is for:

- streetwear
- sneaker
- skate
- BMX
- roller

Visual contract:

- black + off-white foundation
- strong merchant-replaceable neon accent
- aggressive urban/drop character
- readable urban/display headline typography
- clean sans-serif interface typography
- Builder-available fonts only
- Hungarian-character support required
- drop / release / limited-stock / community focus

Explicit exclusions:

- unreadable graffiti-style typography
- baked-in marketing copy inside imagery
- fake scarcity
- gamer-RGB visual language
- Monarche/luxury editorial clone

## Builder-layer rule

Every visible hero/banner marketing element is separately configurable and bindable.

The Home hero uses independent Page Schema nodes for:

- badge
- headline
- copy
- primary CTA
- secondary CTA
- image

The Drop Alert area likewise uses independent nodes for eyebrow, title, copy and CTA.

The deterministic demo SVG files contain no baked marketing wording.

## Engine contract

Required for the full experience:

- E1 — shared runtime
- E2 — shared product discovery authority
- E13 — shared checkout authority

Optional reuse:

- E7 — structured size/material specs
- E3 — guided fit/finder surfaces
- Recommendations — shared recommendation surface

No new product, pricing, inventory, order, payment or customer authority is introduced.

Limited-stock and release scarcity communication must come from real inventory/merchant bindings only.

## Home composition

Scale-out Home order:

1. Drop Hero
2. Release Bar
3. Shop the Drop
4. Categories
5. Limited Stock
6. Street Story
7. New Arrivals
8. Community Journal
9. Drop Alert
10. Footer

Home is intentionally energetic. Catalog and Product are intentionally more ordered.

## Page package

Street Drop ships 14 Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Street Story
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan: `alap`.

Demo namespace: `fashion-street-drop`.

## Catalog

Catalog keeps the fast visual DNA but uses an ordered hierarchy:

- collection header
- common Product Discovery product grid

E2 remains visibility/discovery authority.

## Product page

Desktop/tablet:

- gallery 7/12
- buybox 5/12

Mobile:

- both 12/12

The product page reuses common commerce components:

- product gallery
- product info
- variant swatches
- size selector
- purchase CTA
- recommendations

Sold-out variants remain visible but disabled through the inherited common component safety contract. Unsafe variant URLs remain rejected.

Limited-stock wording is presentation only; inventory binding remains authority.

## Cart and checkout

Cart and checkout deliberately reduce the aggressive visual rhythm.

Checkout metadata locks:

`checkoutPresentation: accordion-dropdown`

E13 remains final checkout authority. The template contains no K&H/vPOS credential, merchant identifier, payment secret or provider-specific behavior.

## Demo content

Namespaced demo fixtures:

- collection `drop-01`
- collection `sneaker`
- product `street-shell`
- content `street-story`

Demo media:

- `public/storefront-demo/street-drop/hero.svg`
- `public/storefront-demo/street-drop/story.svg`
- `public/storefront-demo/street-drop/category.svg`

The SVGs contain abstract visual geometry only; no marketing copy is baked into the images.

## Template install safety

Template installation remains presentation-only/draft-only.

Mutation boundary continues to keep business authority outside template switching:

- storefront page drafts: allowed
- products: forbidden
- variants: forbidden
- customers: forbidden
- orders: forbidden
- B2B data: forbidden

No SQL migration is introduced.

## Implementation diff

Compared with Wave 8 final head, implementation head `700e3bd20a36dc95685f0dd57d8fe2d898cd983f` is exactly one commit ahead and adds 5 files / 0 deletions:

- `src/lib/builder/templates/street-drop.ts`
- `tests/storefront-street-drop-template.test.tsx`
- three local demo SVGs

No existing authority file was modified.

## Implementation CI

Implementation head:

`700e3bd20a36dc95685f0dd57d8fe2d898cd983f`

CI #2007 / Actions run `34245444014`: **SUCCESS**.

Verified:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality suite: PASS — **200 test files / 1335 tests**
- TypeScript: PASS
- production build: PASS
- release manifest: PASS
- Fresh Install: intentionally SKIPPED because Wave 9 adds no baseline migration

Implementation release manifest:

- version: `v24`
- SHA: `700e3bd20a36dc95685f0dd57d8fe2d898cd983f`
- ref: `feature/storefront-street-drop-wave9`
- environment: `ci`
- release hash: `0b2b977da56c1ab9b87a89993ee4d3735689ef00436f1a60c3089e949c43a679`

Only the already-known non-blocking Supabase Edge-runtime and autoprefixer warnings were emitted by production build.

## Explicit non-scope

Wave 9 does not implement:

- a new drop scheduler
- a new inventory/scarcity authority
- fake countdown or fake stock urgency
- recurring/subscription purchase logic
- new size persistence authority
- Visual Builder drag/drop UI
- SQL/customer-baseline migration
- live storefront route switch
- staging/production mutation
- production deployment
- payment/K&H/vPOS changes
- Water-K tenant status change

## Closure rule

Wave 9 is considered implementation/documentation closed only after the documentation HEAD itself passes full branch CI and the stacked Draft PR is created and verified mergeable.
