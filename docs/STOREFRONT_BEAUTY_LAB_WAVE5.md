# Storefront Implementation Wave 5 — E3 Guided Finder + Golden #5 Beauty Lab

## Purpose

Wave 5 implements **E3 — Guided Finder v1** as a generic, deterministic and explainable guided-selling engine and consumes it in **Golden #5 Beauty Lab**.

The implementation is stacked on Wave 4. It remains a storefront/runtime read-model and presentation layer. It does not introduce a new catalog/pricing/inventory/order authority, SQL migration, live route switch, payment behavior or production/shared-staging mutation.

## Dependency chain

Wave 5 starts from Wave 4 final head:

`7b09acd5bf7cf9340cbf9f28b740046c75902d59`

Stacked dependency order:

1. PR #115 — B2B Account Ownership
2. PR #117 — Storefront Runtime Wave 0
3. PR #122 — Golden #1 Monarche / Core Commerce
4. PR #123 — E7 / Golden #2 Tech Deck
5. PR #124 — E10 / Golden #3 Heritage Atelier
6. PR #125 — E11 / Golden #4 Tool Depot
7. Wave 5 — E3 / Golden #5 Beauty Lab

Wave 5 must remain stacked until lower layers land in order.

## E3 — Guided Finder v1

Engine version:

`shoporation.guided-finder.v1`

E3 is a generic guided-selling engine. It is not Beauty-Lab-specific and does not embed template-name branches in the common runtime.

### Tenant-scoped, versioned configuration

A Finder configuration contains:

- schema version;
- stable tenant id;
- stable finder key;
- label;
- safety policy;
- partial-result policy;
- maximum result count;
- ordered steps;
- questions;
- answer options;
- deterministic mapping rules.

Stable keys follow the common lowercase key-safe contract.

### Questions and answer modes

Supported question modes:

- single choice;
- multi choice.

Questions may be required. Selection validation fails closed when:

- a required question has no answer;
- a single-choice question receives multiple answers;
- an unknown option id is supplied.

### Answer → attribute mapping

Each selected option maps to one or more structured product-attribute rules.

Supported operators:

- `eq`
- `includes`
- `gte`
- `lte`
- `exists`

Rule kinds:

- `required`
- `preferred`

Required rules determine exact eligibility for the selected criteria. Preferred rules influence deterministic ordering only after required-rule mismatch count.

### Deterministic ranking

Candidate ordering is deterministic:

1. fewer required-rule mismatches;
2. higher preferred-rule weight score;
3. more preferred matches;
4. stable label ordering;
5. stable id ordering.

There is no opaque machine-learning or black-box score.

### Explainability

Every returned candidate carries criterion-level evidence:

- rule id;
- required/preferred kind;
- matched boolean;
- human-readable reason;
- attribute key.

Storefront surfaces can therefore display both matching and mismatching criteria instead of presenting an unexplained recommendation.

### Exact / partial / zero-result behavior

Finder runs expose explicit status:

- `exact` — all required rules match;
- `partial` — no exact result exists and policy allows nearest results;
- `zero` — no result is returned when configured not to suggest near matches.

Partial mode shows the nearest required-mismatch tier and explicitly states that the result is not an exact match.

Zero-result mode does not fabricate a recommendation.

### Candidate eligibility boundary

The Finder receives product eligibility from the surrounding commerce/discovery authority.

Candidates marked ineligible or carrying unsafe hrefs are excluded. E3 does not override catalog/channel visibility.

### Non-diagnostic safety

Beauty Lab uses `safetyPolicy = non-diagnostic`.

Finder configuration validation rejects diagnosis/treatment/cure-like copy in the guided-selling configuration. This is a product-preference finder, not a medical diagnostic system.

This boundary applies to Finder copy and mapping reasons; it does not create medical claims from product data.

### Builder boundary

Finder questions, option mappings and rule logic are not hidden inside Builder presentation blocks.

The Builder/runtime components only consume Finder state/read models. Template switching does not mutate Finder configuration.

Mutation boundary:

- storefront Page Schema drafts: allowed
- Finder configuration: no mutation
- products: no mutation
- variants: no mutation
- pricing: no mutation
- inventory: no mutation
- customers: no mutation
- orders: no mutation

## Reusable Guided Finder storefront components

Wave 5 adds registry-driven components:

- `guided.finder`
- `guided.results`
- `guided.explanation`
- `guided.attribute-index`
- `guided.attribute-navigation`

The component registry extends the shared structured-product stack from Wave 2.

The renderer remains component-key + version driven. There is no `beauty.beauty-lab` conditional branch in the common runtime.

## Golden #5 Beauty Lab

Template identity:

- key: `beauty.beauty-lab`
- version: `1`
- minimum plan: `alap`
- demo namespace: `beauty-beauty-lab`

### Visual DNA

Beauty Lab direction:

- contemporary beauty concept store / formula lab;
- formula-, ingredient- and texture-driven shopping;
- warm white / cream background;
- muted lilac, sage and dusty-peach accents;
- charcoal text;
- soft modern serif or refined sans display typography;
- clean sans-serif interface typography;
- formula / ingredient / texture / product imagery;
- airy, precise layout with warmth.

Explicitly excluded:

- medical-clinic visual language;
- diagnostic UI;
- black-box recommendation score;
- fabricated clinical claims.

## Approved Home composition

The Page Schema metadata locks this order:

1. Formula Hero
2. Formula Finder
3. Shop by Concern
4. Ingredient Index Preview
5. New Formulas
6. Texture Lab
7. Routine Feature
8. Product Grid
9. Ingredient Story
10. Reviews
11. Footer

The intended journey is:

`formula → ingredient → texture → guided choice → product`

## Page package

Beauty Lab ships 14 declared Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Ingredient Index
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

All presets pass the Alap Template Capability Gate.

## Ingredient / attribute surfaces

Beauty Lab consumes E7 structured product data for ingredient and product-attribute presentation.

Surfaces include:

- Ingredient Index preview;
- ingredient/attribute navigation;
- formula key specs;
- grouped product specifications;
- Finder rule matching against structured product attributes.

E3 does not create a separate ingredient/product attribute authority.

## Product page

Desktop/tablet:

- gallery/media: 7/12
- buybox: 5/12

Mobile:

- both reflow to 12/12

The product page contains:

- shared product information;
- E7 Formula Profile key specs;
- purchase CTA binding;
- E7 grouped ingredient/property data;
- E3 explainability surface showing matching and mismatching criteria;
- recommendations.

## Routine feature / E4 boundary

Beauty Lab contains an editorial Routine Feature section, but **routine recommendation logic is not implemented in Wave 5**.

E4 remains a later engine. The current routine section is only a content/presentation surface and does not infer a routine from Finder answers.

## Engine boundaries

Beauty Lab declares:

- E1 Runtime — consumed from Wave 0;
- E2 Product Discovery — discovery/eligibility binding authority;
- E3 Guided Finder v1 — implemented here;
- E7 Compare & Spec — structured ingredient/attribute data consumed;
- E13 Checkout — checkout authority / binding contract;
- E4 Routine Engine — later, not implemented in Wave 5.

Checkout stays provider-neutral. No K&H/vPOS credential, merchant identifier or payment secret is embedded in Beauty Lab Page Schema.

## Demo-content safety

Beauty Lab demo fixtures are namespaced under `beauty-beauty-lab`.

Demo fixture payloads are regression-tested against diagnosis/cure/treatment/medical-claim vocabulary.

No medical condition or diagnostic result is fabricated as demo product evidence.

## Regression coverage

Wave 5 adds evidence for:

- E3 engine identity;
- tenant-scoped versioned config validation;
- lowercase key-safe identifiers;
- required and multi/single answer validation;
- answer → structured attribute mapping;
- required vs preferred rule semantics;
- deterministic ranking;
- exact-result behavior;
- explainable matched/mismatched evidence;
- explicit partial-result behavior;
- zero-result behavior without invented recommendations;
- ineligible product exclusion;
- non-diagnostic safety-policy rejection;
- Finder configuration preservation across template switching;
- Beauty Lab identity and visual contract;
- 14 Alap-compatible Page Schema presets;
- approved Home ordering;
- Home runtime rendering;
- Ingredient Index / texture-navigation rendering;
- 7/12 + 5/12 product layout;
- 12/12 mobile reflow;
- E7 Formula Profile/spec groups;
- E3 product explainability surface;
- demo medical-claim safety;
- provider-neutral E13 checkout;
- E4 remains explicitly deferred.

## Initial CI finding and correction

Initial implementation head:

`c6e94d6b62b48283b7dac296ed1004b00b5d8dd0`

CI #1979 / Actions run `34230457878` found one fixture-contract issue in `tests/guided-finder-engine.test.ts`:

- the shared key contract intentionally requires lowercase/key-safe attribute keys;
- the test fixture used camelCase `fragranceFree`;
- the validator correctly failed with `FINDER_ATTRIBUTE_KEY_INVALID`.

The engine validation was **not relaxed**. The fixture and candidate attributes were corrected to `fragrance-free`.

Correction commit:

`9efe4d1b94b2b9856082a8475578351cdbc6f989`

## Current implementation CI evidence

Pre-documentation final implementation head:

`9efe4d1b94b2b9856082a8475578351cdbc6f989`

GitHub CI #1980 / Actions run `34230593206`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **195 files / 1287 tests**
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 5 introduces no baseline migration

Release manifest:

- version: `v24`
- SHA: `9efe4d1b94b2b9856082a8475578351cdbc6f989`
- environment: `ci`
- release hash: `2c048af323be345d0003e4af582f3be2b09c6ed3b6c603ab551db685330f1b98`

The documentation commit must also pass complete branch CI before Wave 5 is considered documentation-complete.

## Diff evidence

Compared with Wave 4 final head, the pre-documentation Wave 5 branch is two commits ahead and adds exactly nine Wave 5-specific files:

- Guided Finder engine;
- Guided Finder component registry;
- Guided Finder renderer registry;
- Beauty Lab template package;
- two regression test files;
- three deterministic local demo SVGs.

There is no SQL migration, customer-baseline edit or modification to a pre-existing product/pricing/inventory/order authority file.

## Explicit non-scope

Wave 5 does not implement:

- medical diagnosis;
- treatment/cure recommendation;
- clinical scoring;
- AI/ML black-box ranking;
- new product attribute persistence authority;
- new catalog eligibility authority;
- E4 Routine Engine;
- Visual Builder drag/drop UI;
- Finder admin persistence UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- production/shared-staging mutation;
- production Vercel deployment;
- payment/K&H/vPOS changes;
- Water-K tenant status change.

## Release discipline

Wave 5 must remain a stacked Draft PR on Wave 4 / PR #125.

A green Wave 5 CI authorizes code-level acceptance only. It does not authorize production rollout and must not bypass the PR #115 → #117 → #122 → #123 → #124 → #125 dependency chain.
