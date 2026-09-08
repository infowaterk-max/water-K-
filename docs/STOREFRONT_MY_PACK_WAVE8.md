# Storefront Implementation Wave 8 — E8 Context Profiles + E9 Retention/Reorder + Golden #8 My Pack

## Purpose

Wave 8 implements **E8 — Profile / Context Engine v1** and **E9 — Retention / Reorder Engine v1**, then consumes both in **Golden #8 My Pack**.

E8 is implemented as a generic context-profile engine rather than a pet-only data model. The first registered launch context type is `pet`. E9 exposes existing server retention/replenishment/reorder authority as storefront read models and reorder intents; it is explicitly **not a subscription engine**.

Wave 8 introduces no SQL migration, customer-baseline change, live route switch, production/shared-staging mutation, payment change or Water-K status change.

## Dependency chain

Wave 8 starts from Wave 7 final head:

`2164fd1fdf2a1c911ef534e90aa4021896dd1c1a`

Required stacked order:

1. PR #115 — B2B Account Ownership
2. PR #117 — Storefront Runtime Wave 0
3. PR #122 — Golden #1 Monarche / Core Commerce
4. PR #123 — E7 / Golden #2 Tech Deck
5. PR #124 — E10 / Golden #3 Heritage Atelier
6. PR #125 — E11 / Golden #4 Tool Depot
7. PR #126 — E3 / Golden #5 Beauty Lab
8. PR #127 — E4 / Golden #6 Market Pantry
9. PR #128 — E5 + E6 / Golden #7 Rig Forge
10. Wave 8 — E8 + E9 / Golden #8 My Pack

Wave 8 must remain stacked until lower dependencies land in order.

# E8 — Context Profile Engine v1

Engine version:

`shoporation.context-profile-engine.v1`

## Generic Context Type Registry

E8 introduces a generic, versioned Context Type Registry.

The context concept is deliberately separate from customer identity:

**customer != context**

A customer may have zero, one or multiple context profiles. A guest session may also hold an unsaved context until the user explicitly chooses to save it.

The launch registry contains one context type:

`pet`

The engine is not hardcoded to make every future context a pet profile.

## Pet Profile v1 fields

The first registered Pet Profile contains only commerce-context fields:

- `species`
- `size`
- `life-stage`
- optional `weight-kg`
- `preferences`

Launch enum examples include dog/cat/other, size bands, life stage and simple shopping/lifestyle preferences.

## No health / veterinary data

E8 explicitly excludes health, medical and veterinary profile attributes.

The registry/profile validator rejects health-like keys including concepts such as:

- health
- medical
- diagnosis
- disease
- condition
- medication / medicine
- allergy / allergies
- veterinary / vet

My Pack is a commerce-context experience, not a health record or veterinary profile system.

## Profile ownership and save semantics

Supported owner scopes:

- `customer`
- `guest-session`

A guest-session profile cannot claim persisted saved state by itself.

Saving a profile requires an explicit save intent:

- explicit user action required
- persistence authority: `server-context-profile-authority`

The storefront runtime does not silently convert a temporary guest context into persisted customer data.

## Active context switching

Switching the active context returns an explicit session transition with:

- previous profile id
- next active profile id
- `cartPreserved: true`
- `cartMutationAllowed: false`
- catalog mode: `soft-ranking`
- no required catalog reset

Switching pet/profile context therefore **must not clear or mutate the cart**.

## Soft ranking, not hard catalog lock

An active context may influence discovery ranking and recommendation ordering, but it is not a hard catalog filter.

Context-aware discovery:

- keeps every otherwise eligible candidate;
- excludes only candidates already marked ineligible by the real catalog/discovery authority or candidates with unsafe hrefs;
- derives strong / partial / neutral / mismatch affinity;
- retains mismatch products with `excludedByContext: false`.

The customer can still browse the full eligible catalog even when an active pet profile does not match a product.

This locks the principle:

`activeContextHardLocksCatalog = false`

## Context explainability

Context-aware discovery can expose simple reasons such as matching or differing species, size or preferences.

This supports UI explanations without pretending that context affinity is catalog eligibility authority.

## Preview / production parity

E8 locks:

- `previewUsesProductionRules: true`
- `demoOnlyProfilesAllowed: false`

Preview may render explicitly supplied preview context, but it must use the same profile validation and discovery rules as production. There is no special demo-only profile logic that would disappear on a live storefront.

## Template-switch mutation boundary

Template switching may materialize storefront Page Schema drafts only.

It may not mutate:

- context profiles;
- active context;
- products;
- variants;
- pricing;
- inventory;
- carts;
- customers;
- orders.

# E9 — Retention / Reorder Engine v1

Engine version:

`shoporation.retention-reorder-engine.v1`

## Existing retention authority integration

E9 does not create a second retention scheduler or reorder state authority.

Reorder/replenishment storefront surfaces require:

`authority: server-retention-authority`

Supported journey kinds:

- `replenishment`
- `reorder`

Supported signals:

- `due`
- `due-soon`
- `available`
- `not-due`

The storefront therefore renders actual server-authoritative retention evidence rather than fabricated “running low” UI.

## Current commerce evidence

Every reorder snapshot carries current evidence for:

- product id;
- variant id;
- product label / href;
- active channel visibility;
- current eligibility;
- current price from `shared-pricing-authority`;
- current stock;
- current MOQ;
- current order multiple;
- previous purchased quantity;
- optional context profile id.

Historical price is explicitly **not** current price authority.

## Reorder surface

The read model exposes:

- actual replenishment signal;
- previous quantity;
- current price display;
- current stock label;
- current MOQ / order multiple;
- whether the historical quantity is still valid;
- a suggested current-valid quantity as a hint;
- `requiresServerRevalidation: true`;
- `silentReplacementAllowed: false`.

Unavailable current stock is not shown as a reorderable surface item.

## No silent quantity correction

If the previous quantity no longer satisfies current MOQ/order-multiple rules, E9 may calculate a suggested valid quantity for presentation.

It does **not** silently submit that changed quantity.

For example, if quantity `3` is now invalid under minimum `2` and order multiple `2`, a suggested value may be `4`, but a reorder intent for `3` remains invalid and returns no intent.

The customer must explicitly request a currently valid quantity.

## Reorder cart intent

A valid reorder intent requires current:

1. eligibility
2. channel visibility
3. price
4. stock
5. MOQ
6. order multiple

The intent locks:

- shared pricing authority;
- `silentReplacementAllowed: false`;
- `subscription: false`.

The selected product/variant is never silently substituted with another item.

## Not a subscription engine

E9 is deliberately a retention/replenishment/reorder integration.

It does not implement:

- automatic recurring orders;
- recurring payment authority;
- subscription schedules;
- subscription renewal billing;
- forced replenishment.

Every reorder remains an explicit new purchase under current commerce authority.

## Preview / production parity

E9 locks:

- `previewUsesProductionRules: true`
- `demoOnlyReorderAllowed: false`

Preview does not fabricate retention/reorder state that production could not produce.

## Template-switch mutation boundary

Template switching may not mutate:

- retention journeys;
- reorder signals;
- products;
- variants;
- pricing;
- inventory;
- carts;
- customers;
- orders.

# Reusable storefront components

Wave 8 adds registry-driven components:

- `context.hero`
- `context.profile-selector`
- `context.discovery-row`
- `context.fit-evidence`
- `context.need-navigation`
- `retention.running-low`
- `retention.reorder-row`
- `context.favorites`

The component registry extends the existing common storefront stack. Rendering remains component-key + version driven; no `pet.my-pack` conditional branch is introduced in the shared renderer.

# Golden #8 My Pack

Template identity:

- key: `pet.my-pack`
- version: `1`
- minimum plan: `alap`
- demo namespace: `pet-my-pack`

## Visual DNA

My Pack direction:

- pet-centered household commerce;
- context-aware discovery;
- replenishment/reorder support;
- warm cream background;
- soft charcoal text;
- soft sage, muted coral and calm sky accents;
- friendly rounded sans-serif display typography;
- clean sans-serif interface typography;
- natural home-context pet + product imagery;
- friendly, airy, card-based composition.

Explicit exclusions:

- veterinary-clinic visual language;
- health-profile UI;
- childish cartoon-store treatment;
- subscription-first lock-in;
- fake profile data;
- hard active-context catalog lock.

## Engine contract

Required for the full My Pack experience:

- E1 Runtime
- E2 Product Discovery
- E8 Context Profile
- E9 Retention / Reorder
- E13 Checkout

Useful supporting capabilities:

- E3 Guided Finder
- Recommendations
- E7 structured product attributes

Locked context principles:

- customer is not context;
- active context does not hard-lock catalog;
- profile switch does not clear cart;
- no health/veterinary profile data;
- preview/production parity.

Locked reorder principles:

- not subscription;
- current authority revalidation;
- no silent replacement.

## Approved Home composition

The Page Schema metadata locks this order:

1. My Pack Hero
2. Active Pet Selector
3. Shop for [Pet]
4. Reorder / Running Low
5. Recommended for Context
6. Shop by Need
7. Favorites
8. New & Relevant
9. Footer

Home metadata explicitly declares:

`contextCatalogMode: soft-ranking`

## Page package

My Pack ships 14 Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Context Profile Hub
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

The content preset declares:

`contentRole: context-profile-hub`

All 14 presets are designed for the Alap Template Capability Gate.

## Home behavior with and without profiles

When authority supplies profiles, the Home can render:

- active pet selector;
- context-ranked shopping row;
- actual replenishment/running-low evidence;
- context recommendations;
- needs navigation;
- wishlist/favorites;
- new/relevant product grid.

When no profile exists, the page renders a neutral state:

- no fabricated pet name;
- no demo pet injected;
- full-catalog browsing remains available.

## Catalog and search

Catalog/search profile selectors explicitly describe context as ranking assistance only.

The active profile may influence ordering but must not remove otherwise eligible results solely because they are a context mismatch.

E2 remains catalog/search eligibility authority.

## Product page

Desktop/tablet:

- gallery/media: 7/12
- buybox: 5/12

Mobile:

- both reflow to 12/12

The buybox can show non-exclusive context-fit evidence.

A mismatch affinity is explanatory only and does not disable the common purchase CTA.

## Account

The account preset includes:

- actual-bound context profiles;
- E9 reorder row;
- favorites.

It does not fabricate profile/reorder state when server authority has none.

## Checkout

E13 remains final checkout authority.

The checkout stays provider-neutral and embeds no K&H/vPOS credential, merchant identifier or payment secret.

## Demo-content safety

My Pack demo fixtures are namespaced under `pet-my-pack`.

Demo fixture payloads contain no:

- profile id / active profile;
- reorder / replenishment state;
- subscription state;
- health / medical / diagnosis / veterinary data.

The template may contain neutral explanatory fallback copy, but dynamic profile/reorder UI must be backed by real runtime bindings.

# Regression coverage

Wave 8 adds evidence for:

- E8 engine identity;
- generic versioned Context Type Registry;
- Pet Profile launch fields;
- no health/veterinary fields;
- rejection of unregistered health attributes;
- customer != context;
- active-context switch preserving cart;
- soft-ranking behavior;
- mismatch products retained rather than hard-excluded;
- explicit guest profile save;
- no fake guest persisted state;
- preview/production parity;
- context template-switch boundaries;
- E9 real server retention authority;
- due/due-soon reorder surfaces;
- unavailable stock exclusion;
- no silent historical-quantity correction;
- current eligibility/channel/price/stock/MOQ/order-multiple revalidation;
- no subscription behavior;
- no silent substitution;
- retention template-switch boundaries;
- My Pack identity and visual contract;
- 14 Alap-compatible Page Schema presets;
- approved Home order;
- full-catalog escape with active profile;
- neutral no-profile state without demo pets;
- 7/12 + 5/12 product layout;
- 12/12 mobile reflow;
- non-exclusive context fit evidence;
- demo profile/reorder/health safety;
- provider-neutral E13 checkout.

# Initial CI finding and correction

Initial implementation head:

`cfbb0d39525828ee72178098858a6d9bb9eb460c`

GitHub CI #2003 / Actions run `34239026298` produced:

- dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **200 files / 1334 tests**
- TypeScript: FAIL

The exact compiler error was:

`tests/storefront-my-pack-template.test.tsx(2,3874): error TS1005: '}' expected.`

The defect was a single missing JSX closure in the neutral no-profile renderer test.

No E8/E9 validation or test expectation was weakened.

Correction commit:

`e26af96747fabcc693c067bcc3f3ab48475463db`

Message:

`Fix My Pack neutral-state JSX closure`

# Current implementation CI evidence

Pre-documentation final implementation head:

`e26af96747fabcc693c067bcc3f3ab48475463db`

GitHub CI #2004 / Actions run `34239232697`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **200 files / 1334 tests**
- E8 Context Profile suite: PASS — **6/6**
- E9 Retention/Reorder suite: PASS — **6/6**
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 8 introduces no baseline migration

Release manifest:

- version: `v24`
- SHA: `e26af96747fabcc693c067bcc3f3ab48475463db`
- ref: `feature/storefront-my-pack-wave8`
- environment: `ci`
- release hash: `764bde7a77e65349a714856470454c3eb4515f1c44d098dad0feb2d6d854c8b0`

The build emitted only existing non-blocking Supabase Edge-runtime and autoprefixer warnings.

The documentation HEAD must also pass complete branch CI before Wave 8 is considered documentation-complete.

# Diff evidence

Compared with Wave 7 final head, the pre-documentation Wave 8 branch is exactly **2 commits ahead** and adds **11 Wave 8-specific files / 0 deletions**:

- E8 Context Profile engine;
- E9 Retention/Reorder engine;
- Context/Retention component registry;
- Context/Retention renderer registry;
- My Pack template package;
- three regression test files;
- three deterministic local demo SVGs.

There is no SQL migration, customer-baseline edit or modification to a pre-existing product/pricing/inventory/cart/order authority file.

# Explicit non-scope

Wave 8 does not implement:

- veterinary/medical/health profile records;
- health recommendations;
- hard active-context catalog filtering;
- automatic cart mutation on context switch;
- fake/demo-only profile state;
- fake/demo-only reorder state;
- subscription/recurring-order engine;
- recurring payment authority;
- automatic replenishment order placement;
- silent replacement of unavailable reorder items;
- new pricing/inventory/order authority;
- Context Profile admin persistence UI;
- Retention admin persistence UI;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- production/shared-staging mutation;
- production Vercel deployment;
- payment/K&H/vPOS change;
- Water-K tenant status change.

# Release discipline

Wave 8 must remain a stacked Draft PR on Wave 7 / PR #128.

A green Wave 8 CI authorizes code-level acceptance only. It does not authorize production rollout and must not bypass the PR #115 → #117 → #122 → #123 → #124 → #125 → #126 → #127 → #128 dependency chain.
