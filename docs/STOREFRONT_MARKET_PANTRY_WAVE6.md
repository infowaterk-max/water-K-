# Storefront Implementation Wave 6 — E4 Multi-Product Composer + Golden #6 Market Pantry

## Purpose

Wave 6 implements **E4 — Multi-Product Composer v1** as a generic storefront composition engine and consumes it in **Golden #6 Market Pantry**.

The launch signature is a real-catalog **Build a Box** experience. E4 groups existing product/variant lines into a composition; it does not create a virtual bundle SKU, own pricing, override channel visibility, silently substitute unavailable products or become a separate inventory/order authority.

Wave 6 is stacked directly on Wave 5 and remains code-level storefront/runtime work. It introduces no SQL migration, customer-baseline modification, live route switch, production/shared-staging mutation or payment change.

## Dependency chain

Wave 6 starts from Wave 5 final head:

`ef5c5c25b758dc95ee376c9fd9511aaf38b3f2ae`

Required stacked order:

1. PR #115 — B2B Account Ownership
2. PR #117 — Storefront Runtime Wave 0
3. PR #122 — Golden #1 Monarche / Core Commerce
4. PR #123 — E7 / Golden #2 Tech Deck
5. PR #124 — E10 / Golden #3 Heritage Atelier
6. PR #125 — E11 / Golden #4 Tool Depot
7. PR #126 — E3 / Golden #5 Beauty Lab
8. Wave 6 — E4 / Golden #6 Market Pantry

Wave 6 must not bypass the lower stacked PRs.

## E4 — Multi-Product Composer v1

Engine version:

`shoporation.multi-product-composer.v1`

E4 is generic and template-independent. There is no `food.market-pantry` conditional branch in the common engine/runtime.

### Tenant-scoped versioned configuration

A Composer configuration contains:

- schema version;
- stable tenant id;
- stable composer key;
- label;
- mode;
- global minimum item count;
- global maximum item count;
- duplicate limit;
- optional ordered slot definitions.

Stable engine/config keys follow the lowercase key-safe convention.

### Composition modes

Supported modes:

- `pool`
- `slots`

#### Pool

Any eligible catalog item supplied by the surrounding commerce/discovery authority may be selected within the global constraints.

Pool mode rejects slot definitions and slot-bearing selections.

#### Slots

Slot mode supports structured composition sections such as categories or required roles in a box.

Each slot may define:

- stable id;
- label;
- minimum item count;
- maximum item count;
- optional eligible product-id allowlist.

Selections in slot mode require a valid slot id and must satisfy both slot configuration and catalog eligibility evidence.

## Constraint validation

E4 validates:

- global min/max item count;
- duplicate limit;
- slot min/max constraints;
- required slot minimums;
- slot eligibility;
- stable product/variant identities;
- positive integer quantity;
- catalog item existence;
- safe storefront href;
- current composer eligibility;
- active channel visibility;
- current stock availability;
- current shared-pricing evidence;
- single-currency composition subtotal evidence.

Invalid composition state fails closed.

## Catalog / channel authority boundary

E4 does not decide which products a customer may see or purchase.

`ComposerCatalogItem` receives authority evidence from the surrounding commerce layer:

- `eligible`
- `channelVisible`
- current product/variant identity
- current price evidence
- current stock evidence
- optional slot eligibility

A product that becomes hidden, ineligible or unavailable makes the current composition invalid.

E4 does **not** replace it with another item automatically.

## No silent replacement

Cart intents explicitly carry:

`silentReplacementAllowed: false`

If a selected product or variant becomes unavailable, hidden or invalid, the customer must resolve the composition explicitly.

No automatic nearest-match or substitute behavior is introduced.

## Pricing boundary

E4 is **not a pricing engine**.

Price evidence must declare:

`source: shared-pricing-authority`

The Composer may aggregate current supplied line prices into a display subtotal, but the read model explicitly carries:

- `pricingAuthoritative: false`
- `requiresCartRevalidation: true`

E4 does not create a fixed box price, package price, discount authority or virtual bundle price.

## Stock boundary

Stock is supplied as current external evidence.

A line with `available = false` invalidates the composition. E4 does not reserve inventory and does not substitute another product.

Stock is revalidated at the cart/checkout authority boundary.

## Atomic cart composition intents

Valid selections can produce grouped cart intents for:

- add
- replace/edit
- remove

Add/edit intents contain:

- engine version;
- operation;
- `atomic: true`;
- stable `compositionId`;
- composer key/version;
- real product/variant line intents;
- compositionId propagated to every line;
- required revalidation contract;
- pricing authority marker;
- silent replacement disabled.

Mandatory revalidation:

1. composer eligibility
2. channel
3. price
4. stock

A composition edit uses `replace` semantics so the grouped cart state can be changed atomically rather than partially mutating individual selected lines.

Composition removal is also represented as an atomic grouped intent by `compositionId`.

## Order snapshot / refund semantics

E4 can derive a grouped read model from authoritative historical order lines.

The order snapshot preserves:

- compositionId;
- composer key/version;
- actual order line ids;
- product/variant identity;
- historical quantity;
- historical unit price and currency.

`refundableLineIds` exposes the actual lines belonging to that composition.

The grouping does not turn the composition into one synthetic order SKU. Refund handling can remain line-level under the existing order/refund authority.

## Template-switch mutation boundary

Template switching may only materialize storefront Page Schema drafts.

E4 boundary:

- storefront Page Schema drafts: allowed
- Composer configuration: no mutation
- products: no mutation
- variants: no mutation
- pricing: no mutation
- inventory: no mutation
- carts: no mutation
- customers: no mutation
- orders: no mutation

## Reusable Composer storefront components

Wave 6 adds:

- `composer.builder`
- `composer.summary`
- `composer.order-group`
- `composer.discovery-map`
- `composer.pairing-row`

The component registry extends the previous common registry stack. The renderer remains component-key + version driven.

## Golden #6 Market Pantry

Template identity:

- key: `food.market-pantry`
- version: `1`
- minimum plan: `alap`
- demo namespace: `food-market-pantry`

### Visual DNA

Market Pantry direction:

- modern premium grocery;
- digital market;
- organized pantry;
- packaging-led, product-first merchandising;
- warm cream background;
- tomato-red, olive-green and saffron accents;
- espresso brown / black depth;
- warm confident grocery-editorial display typography;
- clean sans-serif interface typography;
- rich market density without chaotic promotion walls.

Explicit exclusions:

- rustic farmhouse cliché;
- fake fixed Build-a-Box price;
- virtual bundle SKU;
- uncontrolled promotion chaos.

## Approved Home composition

The Page Schema metadata locks this order:

1. Pantry Hero
2. Shop by Pantry
3. Build a Box
4. Market Picks
5. Flavor Map
6. Dense Product Market Grid
7. Editorial Insert
8. Pairing Row
9. Recipe/Inspiration
10. Footer

The Build a Box surface is the Wave 6 signature commerce interaction.

## Page package

Market Pantry ships 14 declared Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Build a Box
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

The content preset declares:

`contentRole: multi-product-composer`

All presets are designed for the Alap Template Capability Gate.

## Home / discovery surfaces

Home includes:

- common editorial hero;
- pantry/category navigation;
- E4 Build a Box composer;
- market product selections;
- Flavor Map merchandising navigation;
- dense product market grid;
- editorial insert;
- pairing row;
- recipe/inspiration editorial feature.

Flavor Map and Pairing are merchandising/discovery presentation. They do not override E2 catalog/search authority.

## Product page

Desktop/tablet:

- gallery/media: 7/12
- buybox: 5/12

Mobile:

- both reflow to 12/12

Product purchase remains the shared commerce path. Pairing recommendations remain separate product links/lines, not implicit bundle lines.

## Cart / checkout integration

The cart can render an E4 `composer.summary` alongside the standard commerce cart summary.

The summary preserves composition grouping and exposes explicit edit/remove actions.

It also warns that price and stock remain subject to authoritative revalidation.

Checkout is owned by E13 and remains provider-neutral.

The Market Pantry Page Schema contains no K&H/vPOS credential, merchant identifier or payment secret.

## Account / historical composition

The account surface can render `composer.order-group` from authoritative historical order evidence.

This grouping is read-only presentation and supports line-level follow-up/refund semantics rather than creating a synthetic historical bundle product.

## Recipe-to-Cart boundary

Recipe/Inspiration is editorial in Wave 6.

**Recipe-to-Cart is not the launch signature and is not implemented in Wave 6.**

No recipe automatically creates or modifies a cart composition.

## Engine boundaries

Market Pantry declares:

- E1 Runtime — consumed;
- E2 Product Discovery — catalog/eligibility binding authority;
- E4 Multi-Product Composer v1 — implemented here;
- E13 Checkout — final cart/checkout revalidation authority;
- E7 Compare & Spec — useful optional structured food attributes;
- E10 Story Engine — useful optional editorial/recipe storytelling.

## Demo-content safety

Demo fixtures are namespaced under `food-market-pantry`.

Fixtures contain no synthetic fixed bundle price or virtual bundle SKU claim.

Demo content does not become product/pricing/inventory authority.

## Regression coverage

Wave 6 adds evidence for:

- E4 engine identity;
- tenant-scoped versioned config;
- pool configuration;
- slot configuration;
- global min/max limits;
- duplicate limits;
- required slot minimums;
- slot eligibility;
- product/variant catalog identity;
- current catalog eligibility;
- channel visibility;
- stock fail-closed behavior;
- shared-pricing-authority-only evidence;
- non-authoritative subtotal aggregation;
- no silent replacement;
- atomic add intent;
- atomic replace/edit intent;
- atomic composition removal;
- mandatory eligibility/channel/price/stock revalidation;
- compositionId propagation;
- authoritative historical order grouping;
- line-level refund identifiers;
- Composer configuration preservation across template switching;
- Market Pantry identity and visual contract;
- 14 Alap-compatible Page Schema presets;
- approved Home ordering;
- Home runtime rendering;
- Build a Box rendering;
- Flavor Map rendering;
- pairing rendering;
- 7/12 + 5/12 product layout;
- 12/12 mobile reflow;
- presentation-only template installation;
- provider-neutral E13 checkout;
- Recipe-to-Cart exclusion.

## Initial implementation CI evidence

Implementation head before this documentation commit:

`3b7c20a393c9c9a9375d799f98d47a1c4f7d6afd`

GitHub CI #1983 / Actions run `34232530088`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **196 files / 1300 tests**
- E4 focused engine tests: PASS — 9 tests
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 6 introduces no baseline migration

Release manifest:

- version: `v24`
- SHA: `3b7c20a393c9c9a9375d799f98d47a1c4f7d6afd`
- environment: `ci`
- release hash: `c5a7337e5274ab7858c2661d63d31a80e149494d58fbff58b6ec5a48d24b1d58`

The production build emitted only existing non-blocking Supabase Edge-runtime and autoprefixer warnings; no Wave 6 build failure occurred.

The documentation HEAD must also pass complete branch CI before Wave 6 is considered documentation-complete.

## Diff evidence

Compared with Wave 5 final head, the pre-documentation Wave 6 implementation is exactly one commit ahead and adds nine Wave 6-specific files:

- Multi-Product Composer engine;
- Composer component registry;
- Composer renderer registry;
- Market Pantry template package;
- two regression test files;
- three deterministic local demo SVGs.

There is no SQL migration, customer-baseline edit or modification to a pre-existing product/pricing/inventory/cart/order authority file.

## Explicit non-scope

Wave 6 does not implement:

- virtual bundle/product SKU authority;
- fixed box pricing authority;
- bundle discount engine;
- inventory reservation engine;
- automatic product substitution;
- Recipe-to-Cart;
- subscription box engine;
- recurring order engine;
- new cart/order persistence authority;
- Composer admin persistence UI;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- production/shared-staging mutation;
- production Vercel deployment;
- payment/K&H/vPOS changes;
- Water-K tenant status change.

## Release discipline

Wave 6 must remain a stacked Draft PR on Wave 5 / PR #126.

A green Wave 6 CI authorizes code-level acceptance only. It does not authorize production rollout and must not bypass the PR #115 → #117 → #122 → #123 → #124 → #125 → #126 dependency chain.
