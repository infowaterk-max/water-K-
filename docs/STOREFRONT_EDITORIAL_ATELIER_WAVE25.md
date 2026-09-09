# Storefront Scale-out Wave 25 — Editorial Atelier / Atelier Nova

## Scope

Wave 25 implements the second approved **Divat & Ruházat** storefront direction as a distinct template rather than a Monarche reskin.

- Template key: `fashion.editorial-atelier`
- Template version: `1`
- Merchant-facing fallback brand: `Atelier Nova`
- Category: fashion-apparel
- Position: editorial / asymmetric / campaign-led luxury
- Branch: `feature/storefront-editorial-atelier-wave25`
- Base branch: `feature/storefront-monarche-wave24`
- Exact base head: `08e2567e6d9d25cd758d336e38eef107b7dcdb00`
- Accepted implementation head: `e52d8c278548a353889a6473f26c680becc560e4`

Wave 25 introduces no new template-specific commerce authority and no template-specific Interactive Scene / hotspot engine.

## Accepted design direction

Editorial Atelier is the fashion-magazine direction of the three-template fashion family.

Core character:

- fashion magazine meets premium commerce;
- broken-white / sand-beige / ink-black base palette;
- merchant-replaceable accent;
- high-contrast editorial serif display typography;
- modern clean sans-serif interface typography;
- large campaign imagery;
- generous editorial negative space;
- asymmetric story-before-grid composition;
- fewer, larger visual focus points;
- large image-led low-chrome product presentation.

Portfolio separation is explicit:

- **Monarche** remains balanced, modern, premium mainstream fashion retail;
- **Editorial Atelier** is asymmetric, campaign-led editorial commerce;
- **Street Drop** remains the later streetwear/drop-culture direction.

Explicit exclusions include:

- Monarche balanced-retail-grid clone;
- Street Drop clone;
- discount density;
- generic symmetric hero → cards → grid composition;
- baked-in campaign text;
- fabricated price, stock, rating, material or fit claims.

## Design tokens

Implementation values:

- background: `#f6f1ea`
- surface: `#e8ddd0`
- muted surface: `#d8cabc`
- text: `#151412`
- muted text: `#69635d`
- border: `#c9bcae`
- primary: `#151412`
- primary contrast: `#fffaf4`
- accent: `var(--merchant-accent, #8f6d61)`

These are implementation tokens for the accepted visual direction, not hard-coded merchant branding.

## Exact Home narrative

Logical Home order:

1. Magazine Cover Hero
2. Issue Statement
3. Campaign Story I
4. Campaign Story II
5. The Edit
6. Shop the Story
7. Featured Silhouettes
8. Journal
9. Newsletter
10. Footer

The runtime may use more than one shared component inside a logical section. In particular, `Shop the Story` is represented in Alap by an editorial story block followed by an authoritative recommendation row.

### Asymmetry contract

The two campaign stories deliberately alternate image position:

- Campaign I: image right;
- Campaign II: image left.

`The Edit` uses a restrained 3-column product selection while `Featured Silhouettes` uses a 2-column story-led product composition. This keeps the page from collapsing into Monarche's balanced retail rhythm.

## Builder compatibility

The template remains fully Builder-ready rather than page-hardcoded.

Separately editable Cover Hero layers:

- image
- eyebrow
- title
- copy
- primary label
- primary href
- secondary label
- secondary href

Each campaign and `Shop the Story` keeps separate bindings for:

- image
- eyebrow
- title
- copy
- CTA label
- CTA href

Responsive modes remain:

- desktop
- tablet
- mobile

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

## Shop the Look / Interactive Scene boundary

The approved fashion direction includes a strong **Shop the Look / Interactive Scene** opportunity for Pro merchants.

Wave 25 deliberately does **not** implement a one-off Atelier hotspot engine.

Contract:

- capability: `shop-the-look-interactive-scene`
- intended plan: `pro`
- Alap fallback: editorial split story + authoritative product recommendation
- future implementation boundary: shared Interactive Scene or Composer engine
- hotspot references may point to authoritative products but cannot own price, stock, variant or order state.

This keeps Alap complete and useful while reserving the richer interactive experience for a reusable cross-template Pro engine.

## Shared engine contract

Required full experience:

`E1 + E2 + E10 + E13`

Optional:

`E7`

### E1 — Runtime / Page Schema

Owns the common Page Schema, responsive behavior, component contract and binding evaluation.

### E2 — Product Discovery

Owns catalog, search and product eligibility authority.

### E10 — Editorial / Story

Owns campaign, Journal, lookbook and editorial story context.

### E13 — Checkout

Owns provider-neutral cart and checkout flow.

### E7 — optional Structured Product

May provide structured product facts when the merchant supplies them. Editorial Atelier does not manufacture a separate fashion fact engine.

Global authority rule:

`editorial-atelier-presentation-never-invents-price-stock-rating-material-fit-sizing-product-attribute-or-order-authority`

## Product page

Desktop/tablet:

- gallery: 7/12
- buybox: 5/12

Mobile:

- gallery: 12/12
- buybox: 12/12

Commerce clarity is explicitly retained for:

- price;
- stock;
- size;
- purchase CTA.

Authority paths include:

- price: `pricing.displayPrice`
- stock: `inventory.stockLabel`
- size options: `variant.sizeOptions`
- purchase destination: `commerce.purchaseHref`

Sold-out variant values remain visible but disabled through the shared fashion variant renderer contract.

Editorial product context is presentation only and cannot override product facts.

## Checkout boundary

Wave 25 uses the shared `commerce.checkout-summary` and E13 authority.

The previously approved accordion checkout direction is retained as a shared-runtime contract:

`guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local`

No Atelier-specific checkout engine and no provider-specific payment implementation is introduced.

## Page package

All 14 Alap-compatible Page Schema presets are present:

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

Manifest minimum plan: `alap`.

Required feature set:

- catalog
- inventory
- orders
- contentMarketing
- marketingBasics
- productRecommendations
- searchFiltering
- commerceIntegrations

Demo namespace:

`fashion-editorial-atelier`

Installation remains draft-only and must not mutate products, variants, customers, orders or B2B records.

## Demo-content authority

Demo fixtures identify collections, products and one editorial issue, but do not embed authoritative commerce/product facts.

They contain no hard-coded:

- price / compare-at price;
- stock state;
- rating / review count;
- material claim;
- fit claim;
- guarantee.

Deterministic demo media:

- `/storefront-demo/editorial-atelier/cover.svg`
- `/storefront-demo/editorial-atelier/campaign-one.svg`
- `/storefront-demo/editorial-atelier/campaign-two.svg`
- `/storefront-demo/editorial-atelier/shop-story.svg`

The SVG fixtures contain abstract visual forms only and do not bake marketing copy into imagery.

## Regression acceptance

`tests/storefront-editorial-atelier-template.test.tsx` locks:

- visual distinctness from Monarche;
- separation from Street Drop;
- E1/E2/E10/E13 shared engine authority;
- no fake one-off Interactive Scene component;
- 14 Alap-compatible presets;
- fail-closed page validation;
- exact Home narrative;
- alternating campaign composition;
- Builder-editable campaign layers;
- authoritative bound product and Journal rendering;
- 7/12 + 5/12 fashion PDP;
- price/stock/size/CTA authority bindings;
- no fabricated demo commerce/product facts;
- provider-neutral E13 checkout;
- shared guided-accordion boundary;
- draft-only namespaced installation.

## Accepted implementation CI

Accepted implementation head:

`e52d8c278548a353889a6473f26c680becc560e4`

GitHub **CI #2091 / Actions run `34340853360`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 unique test files / 1352 tests PASS**;
- 1352 passed / 0 failed / 0 pending / 0 todo;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 25 introduces no database migration.

Implementation release manifest:

- version: `v24`;
- SHA: `e52d8c278548a353889a6473f26c680becc560e4`;
- ref: `feature/storefront-editorial-atelier-wave25`;
- environment: `ci`;
- release hash: `d22cd3eb277d502e5c25c188c1f36957695632a1ed15a6839a68148795e8c031`.

## Implementation diff vs Monarche final head

Compared with `08e2567e6d9d25cd758d336e38eef107b7dcdb00`:

- 7 commits ahead;
- 0 behind;
- 6 added files;
- 167 additions;
- 0 deletions.

Files:

- `src/lib/builder/templates/editorial-atelier.ts`
- `tests/storefront-editorial-atelier-template.test.tsx`
- `public/storefront-demo/editorial-atelier/cover.svg`
- `public/storefront-demo/editorial-atelier/campaign-one.svg`
- `public/storefront-demo/editorial-atelier/campaign-two.svg`
- `public/storefront-demo/editorial-atelier/shop-story.svg`

No SQL/customer-baseline, payment, deployment or shared runtime authority file is changed by this implementation diff.

## Explicit no-deploy rule

Wave 25 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging/production mutation;
- SQL/production migration;
- `main` merge;
- K&H/vPOS/payment behavior change;
- Water-K pilot status change.

GitHub `production build` is compilation/evidence only.

## Closure rule

Wave 25 closes only when:

1. this documentation HEAD passes full current-head GitHub CI;
2. final test totals and final release hash are independently recorded;
3. final diff is verified against Monarche final head;
4. a Draft PR is stacked directly on `feature/storefront-monarche-wave24` / PR #147;
5. that PR is open, not merged and mergeable/clean.
