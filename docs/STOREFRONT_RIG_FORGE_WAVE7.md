# Storefront Implementation Wave 7 — E5 Product Configurator + E6 Compatibility + Golden #7 Rig Forge

## Purpose

Wave 7 implements **E5 — Product Configurator v1** and **E6 — Compatibility Engine v1**, then consumes both in **Golden #7 Rig Forge**.

E5/E6 are generic, template-independent storefront/read-model engines. They do not create a parallel product/specification system. Compatibility evidence is derived from the shared **E7 Compare & Spec Engine v1** structured specification authority, while final compatibility/cart validation remains server-authoritative.

Wave 7 introduces no SQL migration, customer-baseline change, live route switch, production/shared-staging mutation, payment change or Water-K status change.

## Dependency chain

Wave 7 starts from Wave 6 final head:

`365a790f9295220af322080f579a8de7e8910f93`

Required stacked order:

1. PR #115 — B2B Account Ownership
2. PR #117 — Storefront Runtime Wave 0
3. PR #122 — Golden #1 Monarche / Core Commerce
4. PR #123 — E7 / Golden #2 Tech Deck
5. PR #124 — E10 / Golden #3 Heritage Atelier
6. PR #125 — E11 / Golden #4 Tool Depot
7. PR #126 — E3 / Golden #5 Beauty Lab
8. PR #127 — E4 / Golden #6 Market Pantry
9. Wave 7 — E5 + E6 / Golden #7 Rig Forge

Wave 7 must remain stacked until lower dependencies land in order.

# E6 — Compatibility Engine v1

Engine version:

`shoporation.compatibility-engine.v1`

## Compatibility states

E6 exposes exactly three states:

- `compatible`
- `incompatible`
- `unknown`

The central safety rule is:

**Unknown never counts as Compatible.**

A build can be globally `compatible` only when every required compatibility rule is both evaluable and compatible.

If any required rule is proven incompatible, the overall status is `incompatible`.

If no required rule is incompatible but at least one required rule lacks sufficient evidence, the overall status is `unknown`.

## E7 structured-spec authority

Compatibility evidence explicitly declares:

`source: compare-spec-engine.v1`

The E6 authority contract identifies the underlying structured specification engine as:

`shoporation.compare-spec-engine.v1`

E6 therefore does not create a second technical attribute registry. Slot compatibility rules reference existing E7 spec keys.

## Rule model

Rules contain:

- stable rule id;
- human-readable label;
- rule kind;
- operator;
- left operand;
- right operand or literal;
- compatible explanation;
- incompatible explanation;
- unknown explanation.

Rule kinds:

- `required`
- `advisory`

Supported operators:

- `eq`
- `neq`
- `gte`
- `lte`
- `overlap`
- `contains`
- `exists`

Operands reference:

- `slotId`
- `specKey`

Rule/spec identifiers follow the lowercase key-safe convention used by the structured specification registry.

## Explainability

Every evaluated rule returns:

- rule id;
- label;
- required/advisory kind;
- status;
- left display value;
- right display value;
- human-readable explanation.

The UI therefore never needs to present an unexplained green/red compatibility badge.

## Fail-closed semantics

Missing part evidence, missing spec evidence, unsupported value comparisons or invalid rules do not become positive compatibility evidence.

Missing required evidence yields `unknown`.

Malformed rule definitions fail validation rather than being silently ignored.

## Client/server authority boundary

`COMPATIBILITY_AUTHORITY_CONTRACT` locks:

- client evaluation authoritative: false
- Unknown counts as Compatible: false
- final validation: server-authoritative
- structured spec authority: E7 Compare & Spec Engine v1

The client/runtime compatibility evaluation is an explainable decision aid and preflight read model. It is not the final transactional authority.

# E5 — Product Configurator v1

Engine version:

`shoporation.product-configurator.v1`

## Tenant-scoped configuration

A v1 Configurator contains:

- version;
- tenant id;
- stable configurator key;
- label;
- ordered component slots.

A slot contains:

- stable id;
- label;
- required flag;
- optional eligible-product allowlist.

v1 allows one selected product/variant per slot.

## Catalog part evidence

A selectable part contains:

- product id;
- variant id;
- label;
- safe product href;
- eligible slot ids;
- current catalog eligibility;
- active-channel visibility;
- price evidence from shared pricing authority;
- current stock evidence;
- E7-backed compatibility specification evidence.

E5 does not own product, variant, pricing, stock or channel authority.

## Selection validation

E5 fails closed on:

- invalid ids;
- unknown slot;
- duplicate selection in one slot;
- product not eligible for the slot;
- product/variant no longer present;
- unsafe href;
- current catalog ineligibility;
- channel-hidden product;
- out-of-stock product;
- invalid/non-authoritative price evidence.

There is no automatic substitute when a selected part becomes unavailable.

## Configurator read-model states

E5 exposes:

- `incomplete`
- `ready`
- `incompatible`
- `unknown`
- `invalid`

`incomplete` means required slots remain empty.

`incompatible` means E6 proved at least one required incompatibility.

`unknown` means the slot selection is otherwise valid, but E6 cannot prove every required rule compatible.

Only `ready` may create a cart intent.

## Pricing boundary

Selected part prices must come from:

`shared-pricing-authority`

E5 may aggregate supplied current line prices for display, but the read model explicitly marks:

- `pricingAuthoritative: false`
- `requiresServerRevalidation: true`

E5 is not a pricing engine.

## Atomic cart intent

A valid ready configuration can produce grouped `add` or `replace` cart intents.

Each intent carries:

- E5 engine version;
- E6 engine version;
- `atomic: true`;
- stable `configurationId`;
- configurator key/version;
- real product/variant lines;
- one quantity per selected component in v1;
- mandatory revalidation list;
- shared pricing authority marker;
- server-authoritative compatibility marker;
- `silentReplacementAllowed: false`.

Mandatory server revalidation:

1. configurator eligibility
2. compatibility
3. channel
4. price
5. stock

Unknown or incompatible client state cannot generate a cart intent.

## Template-switch mutation boundary

Template switching may materialize storefront Page Schema drafts only.

It may not mutate:

- Configurator configuration;
- Compatibility rules;
- products;
- variants;
- pricing;
- inventory;
- carts;
- customers;
- orders.

# Reusable storefront components

Wave 7 adds registry-driven components:

- `configurator.hero`
- `configurator.builder`
- `configurator.slot-list`
- `compatibility.status`
- `compatibility.evidence`
- `configurator.summary`
- `configurator.performance-targets`

The registry extends the existing common storefront stack. Rendering remains component-key + version driven; no `gaming.rig-forge` conditional runtime branch is introduced.

# Golden #7 Rig Forge

Template identity:

- key: `gaming.rig-forge`
- version: `1`
- minimum plan: `alap`
- demo namespace: `gaming-rig-forge`

## Visual DNA

Rig Forge direction:

- dark performance-PC configurator;
- technical but ordered;
- near-black background;
- graphite surfaces;
- cool-white typography;
- restrained cyan and controlled violet accents;
- bold technical sans display;
- compact clean interface typography;
- optional monospace treatment for data;
- component-first PC imagery with controlled lighting.

Explicit exclusions:

- uncontrolled RGB chaos;
- gamer clutter;
- fake compatibility badges;
- industrial tool-store visual language.

## Engine contract

Required for full Rig Forge experience:

- E1 Runtime
- E2 Product Discovery
- E5 Product Configurator
- E6 Compatibility
- E7 Compare & Spec
- E13 Checkout

Locked compatibility principles:

- Unknown is not Compatible;
- explanations are required;
- server performs final validation;
- no silent replacement.

## Approved Home composition

The Page Schema metadata locks this order:

1. Performance Hero
2. Start Your Build
3. Component Categories
4. Performance Targets
5. Compatibility Confidence
6. Featured Components
7. Featured Build
8. Upgrade Paths
9. Build Guides
10. Footer

## Page package

Rig Forge ships 14 declared Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Rig Builder
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

The content preset declares:

`contentRole: product-configurator`

All 14 presets are designed for the Alap Template Capability Gate.

## Home / configurator experience

Home includes:

- Performance Hero;
- inline Configurator builder;
- component-category navigation;
- performance-target navigation;
- explicit compatibility status;
- featured components;
- editorial featured build;
- upgrade-path discovery;
- build guides.

The Hero and Builder never claim compatibility from marketing copy. Compatibility state comes through E6 bindings.

## Catalog

Catalog consumes:

- E2 catalog/discovery authority;
- E7 structured facets;
- common product grid.

The template does not hardcode a separate PC-parts attribute system.

## Product page

Desktop/tablet:

- gallery/media: 7/12
- buybox: 5/12

Mobile:

- both reflow to 12/12

Product page includes:

- common product information;
- E7 key specs;
- E7 compare action;
- purchase CTA;
- full E7 specification groups;
- E6 compatibility evidence against the active build context;
- recommendations.

## Cart

The cart may show:

- E5 configuration summary;
- E6 compatibility status;
- standard common cart summary.

An Unknown state remains visibly distinct and cannot be treated as a validated compatible build.

## Checkout

E13 remains final checkout authority.

The checkout copy explicitly states that final compatibility, channel, price and stock validation is server-side.

The template is provider-neutral and embeds no K&H/vPOS credential, merchant identifier or payment secret.

## Account / historical builds

Historical configuration summaries are presentation only.

A historical build is not treated as current compatibility evidence because products, variants, stock and specifications may have changed.

## Demo-content safety

Demo fixtures are namespaced under `gaming-rig-forge`.

Fixtures do not fabricate:

- `compatible=true` evidence;
- fixed build prices;
- current compatibility status.

Compatibility state must come from E6 runtime evidence.

# Regression coverage

Wave 7 adds evidence for:

- E6 engine identity;
- E7-backed compatibility evidence;
- required/advisory rule validation;
- compatible status only when every required rule is known and compatible;
- explicit incompatible evidence;
- Unknown never Compatible;
- malformed rules fail closed;
- E5 engine identity;
- tenant-scoped ordered slots;
- incomplete configuration blocking cart intent;
- ready configuration with known compatible E6 state;
- slot/catalog/channel/stock validation;
- no silent substitution;
- Unknown compatibility blocking cart intent;
- atomic add intent;
- atomic replace/edit intent;
- mandatory eligibility/compatibility/channel/price/stock revalidation;
- pricing and compatibility marked non-authoritative client-side;
- template-switch mutation boundary;
- Rig Forge identity/visual contract;
- 14 Alap-compatible Page Schema presets;
- approved Home ordering;
- runtime rendering of explicit Unknown state;
- 7/12 + 5/12 product layout;
- 12/12 mobile reflow;
- E7 spec surfaces;
- E6 product compatibility evidence;
- demo compatibility-claim safety;
- provider-neutral E13 checkout.

# Initial CI finding and correction

Initial implementation commit:

`2ef877dc55ee25666d27cb46200fbb1a5b918892`

GitHub CI #1995 / Actions run `34236000522` correctly rejected four E6 tests because one test fixture used the camelCase E7 spec key:

`cpuPower`

The shared E7/E6 key contract requires lowercase key-safe specification keys.

The failure surfaced as:

`COMPATIBILITY_RIGHT_OPERAND_INVALID`

for `rules.1.right`.

The E6 validator was **not relaxed**.

The fixture/evidence key was corrected to:

`cpu-power`

Correction commit:

`2c6648a287786acd55129556ecc2db7c17534430`

# Current implementation CI evidence

Pre-documentation final implementation head:

`2c6648a287786acd55129556ecc2db7c17534430`

GitHub CI #1998 / Actions run `34236196510`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **198 files / 1317 tests**
- E6 Compatibility suite: PASS — **5/5**
- E5 Product Configurator suite: PASS — **7/7**
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 7 introduces no baseline migration

Release manifest:

- version: `v24`
- SHA: `2c6648a287786acd55129556ecc2db7c17534430`
- ref: `feature/storefront-rig-forge-wave7`
- environment: `ci`
- release hash: `c00e2fcc73b43fc8f5946d96db86233fca98fb87f4e36852844253ec46a2aba4`

The build emitted only existing non-blocking Supabase Edge-runtime and autoprefixer warnings.

The documentation HEAD must also pass complete branch CI before Wave 7 is considered documentation-complete.

# Diff evidence

Compared with Wave 6 final head, the pre-documentation Wave 7 branch is exactly two commits ahead and adds 11 Wave 7-specific files:

- E6 Compatibility Engine;
- E5 Product Configurator;
- Configurator component registry;
- Configurator renderer registry;
- Rig Forge template package;
- three regression test files;
- three deterministic local demo SVGs.

There is no SQL migration, customer-baseline edit or modification to a pre-existing product/pricing/inventory/cart/order authority file.

# Explicit non-scope

Wave 7 does not implement:

- a second product specification registry;
- compatibility persistence as a new product authority;
- automatic/silent substitute parts;
- AI/ML black-box compatibility scoring;
- benchmark/FPS prediction authority;
- power-supply sizing guarantee beyond explicit configured E7 rules;
- overclocking safety certification;
- inventory reservation;
- new pricing authority;
- new cart/order persistence authority;
- Configurator admin persistence UI;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- production/shared-staging mutation;
- production Vercel deployment;
- payment/K&H/vPOS change;
- Water-K tenant status change.

# Release discipline

Wave 7 must remain a stacked Draft PR on Wave 6 / PR #127.

A green Wave 7 CI authorizes code-level acceptance only. It does not authorize production rollout and must not bypass the PR #115 → #117 → #122 → #123 → #124 → #125 → #126 → #127 dependency chain.
