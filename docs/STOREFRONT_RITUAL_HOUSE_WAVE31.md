# Storefront Scale-out Wave 31 — Ritual House Re-acceptance & Builder Hardening

## Scope

Wave 31 re-accepts and hardens the inherited `beauty.ritual-house` v1 template on the exact Wave 30 stacked baseline. It does **not** create a second Ritual House template and does not introduce a template-local layout, hero, commerce, wellness, medical, product-attribute, pricing, inventory, review, order or checkout authority engine.

Branch:

`feature/storefront-ritual-house-wave31`

Stacked base branch:

`feature/storefront-derma-studio-wave30`

Exact Wave 30 base:

`29751e3671ad9082dd3be914ab02070ff4e2bf11`

Production main baseline inherited through Wave 30:

`676a3216caf92281f663a94b1b138d0ed28d9e8b`

Historical Ritual House implementation already existed as Wave 13, including the canonical template, regression coverage, documentation and demo assets. Wave 31 therefore modifies the inherited canonical v1 only where the current Builder/authority contract requires re-acceptance or hardening.

Accepted implementation head before this documentation commit:

`08349c8499020091e156451f2b5438b78932088e`

## Beauty & Wellness family separation

The three Beauty & Wellness directions remain intentionally distinct in journey, layout rhythm, visual treatment and merchandising structure.

### Beauty Lab

Journey:

`formula → ingredient → texture → guided choice → product`

Contemporary beauty concept-store / formula-lab direction.

### Derma Studio

Journey:

`concern → routine → active ingredient → product`

Clinically clean, concern-first and routine-first skincare commerce with deterministic, explainable, non-diagnostic E3 guidance.

### Ritual House

Journey:

`mood → ritual → format → scent or ingredient → product`

Owns the sensory / cocooning / warm-dark / ritual-led wellness-commerce direction for merchants such as candle, diffuser, bath, body care, fragrance and self-care stores.

Ritual House is not a recolored Beauty Lab or Derma Studio. Its accepted identity uses slower editorial rhythm, warm-dark atmospheric surfaces, sensory imagery, mood-led navigation, ritual storytelling and format/scent merchandising rather than formula-lab or clinical concern-first composition.

## Visual direction

Accepted Ritual House visual character remains:

- smoked-umber background;
- warm-taupe surfaces;
- soft-ivory text;
- candle-amber primary treatment;
- muted-sage secondary treatment;
- soft editorial serif display treatment;
- clean warm sans interface treatment;
- candle, diffuser, oil, cream, bath, steam and texture imagery;
- slow, generous, cocooning spacing.

Merchant-controlled accent remains tokenized through `--merchant-accent`.

Explicit exclusions remain:

- clinical skincare UI;
- diagnostic or medical UI;
- medical aromatherapy claims;
- therapeutic, stress-reduction, sleep-improvement or healing claims without authoritative merchant evidence;
- black-box wellness scoring;
- invented product facts or efficacy claims.

## Engine and authority contract

Ritual House composes existing shared systems only:

- E1 Runtime / Page Schema
- E2 Product Discovery authority
- E7 structured scent / format / ingredient / product-attribute data
- E10 Story / editorial content
- E13 Checkout

No Ritual House-specific engine was introduced.

Authority rule remains:

`mood-and-ritual-navigation-is-editorial-merchandising-not-health-or-aromatherapy-outcome-authority`

The template is not authority for:

- price;
- stock or inventory;
- variants;
- ratings/reviews;
- scent, ingredient, material or other product attributes;
- medical/wellness outcomes;
- order state.

Missing authoritative data is not fabricated by template fallbacks.

## Wave 31 Builder hardening

### Shared Story + Visual Layer composition

The inherited Ritual House v1 remains the canonical template. Wave 31 composes the existing E10 Story registry with the existing shared visual primitives instead of creating a template-specific hero/layout engine.

Shared visual primitives used:

- `visual.layered-canvas`
- `visual.layer`

The Atmosphere Hero is now independently editable through Builder components for:

1. image
2. overlay
3. decoration
4. eyebrow
5. heading
6. copy
7. primary CTA
8. secondary CTA

Marketing copy, price, rating, stock, product facts, wellness claims and CTA text are not baked into image assets.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Responsive contract remains Desktop / Tablet / Mobile.

### Binding and Page Schema hardening

Current-baseline validation exposed several inherited contract mismatches, all fixed without granting new template authority:

- `commerce.review-summary` now uses only its shared `rating`, `count`, `label` binding contract;
- rating/count fallback remains `null`, so Ritual House cannot invent review evidence;
- Journal bindings use the allowlisted `content.journal.items` path rather than introducing a Ritual-specific or globally widened namespace;
- duplicate Catalog node identity was removed by separating the system header ID from the collection-header ID;
- the shared presentation-only `commerce.key-specs` component now allows `content` pages in addition to `home` and `product`, matching its existing `title/items` read-model role; this does not create product-fact authority.

### CI regression execution hygiene

The repository's current Vitest include contract executes `tests/**/*.test.ts`. Historical storefront `.test.tsx` files are therefore not relied on as Wave 31 acceptance evidence.

Wave 31 adds a CI-executed regression file:

`tests/storefront-ritual-house-wave31-reacceptance.test.ts`

The global Vitest include scope was deliberately not broadened in this wave.

## Wave 31 regression contract

The current Wave 31 regression protects:

- canonical inherited `beauty.ritual-house` v1 re-acceptance rather than duplicate-template creation;
- Beauty Lab / Derma Studio / Ritual House structural distinctness beyond palette changes;
- shared Story + Visual Layer composition;
- independently editable Atmosphere Hero layers;
- all 14 Page Schema presets;
- Alap compatibility;
- Desktop / Tablet / Mobile manifest compatibility;
- namespaced demo lifecycle and draft-only installation;
- non-medical, non-psychological mood/ritual merchandising guidance;
- external authority for price, stock, variants, ratings and product facts;
- provider-neutral E13 checkout;
- no release-side-effect authorization.

Wave 31 regression assertions on accepted implementation CI: **7 / 7 PASS**.

## Page package

Ritual House continues to provide all 14 Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Template minimum plan remains `alap`.

Demo namespace remains:

`beauty-ritual-house`

Installation remains draft-only and cannot mutate authoritative merchant commerce entities such as products, variants, customers, orders or B2B ownership.

## Home merchandising structure

Accepted Ritual House Home composition remains ritual-led rather than formula- or concern-led:

1. Atmosphere Hero
2. Ritual by Mood
3. Bath & Body
4. Home Fragrance
5. Evening Ritual Story
6. Featured Ritual Sets
7. Scent & Ingredient Notes
8. Reviews
9. Journal
10. Footer

This structure is intentionally different from Beauty Lab and Derma Studio in section order, rhythm and merchandising journey.

## Product and review authority

Product-page data remains binding-driven:

- price from `pricing.*` authority only;
- stock from `inventory.*` authority only;
- variants from `variant.*` authority only;
- product facts from `product.*` / shared structured-product authority only;
- recommendations from the shared recommendation authority;
- review rating/count from `reviews.*` authority only and no fabricated fallback values.

Ritual context may describe placement in a merchant-curated routine or atmosphere, but it may not infer therapeutic outcomes or unsupported health benefits.

## Checkout

Checkout remains shared, E13-bound and provider-neutral.

Wave 31 does not alter K&H/vPOS credentials, transaction behavior, payment status handling, provider selection or payment secrets.

## Accepted implementation CI

Implementation head:

`08349c8499020091e156451f2b5438b78932088e`

GitHub **CI #2225 / Actions run `34469878940`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **219 unique test files / 440 suites / 1549 tests PASS**;
- passed: 1549;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 31 regression: 7 / 7 PASS;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 31 introduces no database migration.

Quality artifact:

- artifact id: `10149070736`;
- digest: `sha256:c5cc35a03a97aca321f7ee30c0e6e5c2d156388d9e64a07d8632c158cd6793f3`.

Implementation release manifest:

- artifact id: `10149110539`;
- artifact digest: `sha256:c19a91fd12e6b7c7306b48d2b2339e37fd1f8c15076095f3cbdafb7045cedf89`;
- version: `v24`;
- SHA: `08349c8499020091e156451f2b5438b78932088e`;
- ref: `feature/storefront-ritual-house-wave31`;
- environment: `ci`;
- release hash: `6cf6f4bb8650b8fdf16000efc1ad01a4d61ad649e251ccdb846d0b7af3109a66`.

## Explicit no-deploy rule

Wave 31 does not trigger or authorize:

- merge to `main`;
- Vercel production deployment/promotion;
- Supabase production or staging data mutation;
- SQL migration;
- K&H/vPOS/payment behavior changes;
- Water-K `pilot` status change.

An automatic branch Preview from Git integration, if any, is not a production rollout.

## Closure rule

Wave 31 closes only when:

1. this documentation HEAD passes a fresh full exact-head GitHub CI;
2. final current-head quality and release-manifest artifacts are processed separately;
3. final test totals and final release hash are recorded from those artifacts;
4. final diff is verified against exact Wave 30 head `29751e3671ad9082dd3be914ab02070ff4e2bf11`;
5. a Draft PR targets `feature/storefront-derma-studio-wave30`;
6. that PR is open, Draft, not merged, mergeable, rebaseable and clean;
7. production, Supabase and payment behavior remain unchanged.
