# Storefront Scale-out Wave 20 — Loot Vault

## Purpose

Wave 20 implements **Loot Vault** directly on top of Playroom / PR #142.

- Template key: `gaming.loot-vault`
- Template version: `1`
- Category: `gaming-geek`
- Base branch: `feature/storefront-playroom-wave19`
- Base final head: `3d62a1da93d10b89ff855a86ee1971ab4dd6fea7`
- Corrected implementation head: `75d077ca867446b0c4e415ac2da2b3584400ecfc`

This is code-only storefront scale-out. It introduces no SQL migration, customer-baseline mutation, live storefront route switch, payment change, Vercel/Supabase deployment or Water-K tenant-status change.

Per current release discipline, individual template waves are **not deployed**. Deployment remains deferred until the active template-wave sequence can be handled as one controlled release candidate.

## Gaming & Geek family separation

Loot Vault is the collector-oriented member of the Gaming & Geek family:

- **Playroom** — broad gaming/console discovery and social play;
- **Rig Forge** — technical PC build/configuration and compatibility;
- **Loot Vault** — collectibles, merch, editions, preorder/drop presentation and collector editorial.

Loot Vault does not duplicate Playroom's broad console-discovery role and does not embed Rig Forge's PC configurator.

## Visual DNA

Character:

`dark-theatrical-collector-vault-commerce`

Palette:

- near-black background;
- smoke-grey surfaces;
- warm ivory text;
- restrained antique bronze/gold accent;
- oxidized green secondary accent;
- rarity color only when supplied by actual structured data/presentation rules.

Typography:

- cinematic/editorial serif or display typography;
- clean sans interface typography;
- compact technical labels for edition/collector facts.

Imagery:

- collectible display cases;
- figurines;
- props;
- art books;
- boxed editions;
- archive/vault lighting.

Explicit exclusions:

- RGB/gamer chaos;
- loot-box/gambling UI;
- fake scarcity;
- fake countdowns;
- fake rarity;
- fake exclusivity;
- fake numbered-edition claims;
- fake preorder/release dates;
- Collection Tracker in v1;
- PC-builder duplication;
- broad-console-discovery duplication.

## Rarity presentation

Supported presentation labels:

- Common
- Rare
- Epic
- Legendary
- Mythic

These labels are **not authority by themselves**. A template cannot assign rarity to a product merely for visual effect. Rarity must come from genuine structured product data or merchant-authoritative content.

## Historical engine correction

Earlier Loot Vault planning notes associated preorder/drop behavior with **E9** and considered Collection Tracker alongside **E8**.

The actual current Shoporation engine definitions were re-verified from the exact Wave 8 implementation documentation:

- **E8 = Context Profile Engine v1** (`shoporation.context-profile-engine.v1`)
- **E9 = Retention / Reorder Engine v1** (`shoporation.retention-reorder-engine.v1`)

E9 is explicitly reorder/replenishment authority and is **not** a preorder/drop engine.

Therefore Loot Vault v1 does not misuse E9 as preorder authority and does not pull E8 in merely to obtain a Collection Tracker.

## Final engine contract

Required full experience:

`E1 + E2 + E7 + E10 + E13`

Explicitly not required in v1:

`E8 + E9`

### E1 — Runtime

Shared Page Schema/runtime/component registry/responsive authority.

### E2 — Product Discovery

Owns catalog/search/channel/product eligibility.

The `Limited / Exclusive / Preorder` area is a presentation over real eligible catalog/product state. It does not become a separate drop/preorder product authority.

### E7 — Structured Product / Compare & Spec

Owns structured collector facts such as genuinely supplied:

- rarity;
- edition type;
- numbering;
- format;
- product/release metadata where represented in the current product model;
- relevant catalog facets.

Missing data stays missing.

### E10 — Editorial / Story

Owns collector guides, Vault Feature and editorial object/universe stories.

Editorial copy cannot promote an unverified rarity, edition size, provenance or exclusivity claim into commerce truth.

### E13 — Checkout

Provider-neutral cart/checkout and final commerce validation authority.

Global authority rule:

`collector-presentation-never-invents-scarcity-rarity-exclusivity-numbering-preorder-release-price-stock-or-order-authority`

## Preorder / drop boundary

Loot Vault v1 does not create a new preorder engine.

Preorder/drop presentation is permitted only over current authoritative read models including:

- E2 catalog/product eligibility;
- product data;
- `commerce.*` purchase intent/read-model bindings;
- `inventory.*` stock/availability evidence;
- `pricing.*` current price authority.

Examples:

- a `Preorder` product badge is rendered only if the product read model supplies it;
- `Előrendelhető` may be shown only when inventory/commerce authority supplies that state;
- purchase CTA can become `Előrendelés` only through current commerce binding;
- the template does not generate a countdown, release date or limited-stock claim itself.

This follows the same safety principle already used by Street Drop: scarcity/release presentation must not outrank current commerce/inventory authority.

## Collection Tracker boundary

**Collection Tracker is deliberately deferred from Loot Vault v1.0.**

The current account preset explicitly remains a normal account/order surface and does not fabricate:

- owned collection state;
- `Már megvan` state;
- collection completeness;
- collection monetary value;
- missing-piece recommendations based on invented ownership;
- tracker persistence.

A future Collection Tracker can be added only when its ownership/state authority and Builder contract are explicitly implemented and proven. It is not smuggled into v1 by reusing E8's current Context Profile semantics.

## Exact Home composition

The recovered v1 Home order is locked in metadata and regression tests:

1. Vault Hero
2. Universe Selector
3. Limited / Exclusive / Preorder
4. Collector Selection
5. Vault Feature
6. Drop Alert
7. Join the Hunt
8. Footer

`Collector Selection` is explicitly the largest commerce area.

### Vault Hero

Uses shared `story.hero` and establishes the theatrical archive/vault visual identity.

### Universe Selector

Uses shared collection navigation. Demo content stays generic rather than baking third-party franchise trademarks into the template package.

### Limited / Exclusive / Preorder

Uses common product-grid presentation over real catalog items.

No default fixture carries fake limited/exclusive/preorder authority.

### Collector Selection

Main commerce grid for eligible collector products.

### Vault Feature

Uses E10 `story.feature` for collector editorial.

### Drop Alert

Marketing/newsletter CTA only. It does not create release authority, countdowns or scarcity.

### Join the Hunt

Editorial discovery CTA. The copy explicitly avoids gambling mechanics: collection discovery, not loot-box odds or chance-based purchasing.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- both reflow to 12/12.

PDP includes:

- common gallery;
- common product info with current pricing/inventory bindings;
- generic option selector;
- E7 `Collector Facts`;
- standard/current commerce purchase CTA;
- grouped edition/format/provenance data;
- E10 collector story feature;
- common recommendation row.

Regression coverage proves that `Legendary`, `Numbered`, `12 / 500`, `Előrendelhető` and `Előrendelés` appear only when explicitly supplied in runtime binding context.

## Catalog / search

Catalog combines:

- collection header;
- E7 structured collector facets;
- E2-authoritative product grid.

Search remains E2-authoritative and can present E7 structured collector data.

## Content and journal

Content role:

`collector-guide`

Engine binding:

`E7+E10`

Blog Index uses shared E10 `story.index` as the Vault Journal.

## Page package

Loot Vault ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Collector Guide
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan: `alap`

Demo namespace: `gaming-loot-vault`

No core Loot Vault surface is artificially Pro-gated.

## Demo fixtures and media

Namespaced demo fixtures:

- collection `vault-figures`;
- collection `vault-art-books`;
- product `vault-figure`;
- product `vault-art-book`;
- content `collector-guide`.

Deterministic local demo media:

- `public/storefront-demo/loot-vault/vault.svg`
- `public/storefront-demo/loot-vault/promo.svg`
- `public/storefront-demo/loot-vault/hunt.svg`

Fixtures intentionally omit:

- rarity;
- limited/exclusive state;
- numbered-edition state;
- preorder/release date;
- stock count;
- countdown;
- collection-tracker state;
- loot-box odds.

## Builder compatibility

Loot Vault remains inside the established Builder/runtime foundation:

- Template Manifest;
- 14 Page Schema presets;
- shared E7/E10 component registry;
- component-key/version rendering;
- responsive Page Schema configuration;
- allowlisted Binding Layer;
- namespaced demo lifecycle;
- draft-only template install.

No `gaming.loot-vault` hardcoded runtime branch is introduced.

The actual drag/drop Visual Builder remains deferred to its later roadmap block.

## Template-install mutation boundary

Template installation/switching may materialize storefront Page Schema drafts only.

It does not mutate:

- products;
- variants;
- pricing;
- inventory;
- customers;
- carts;
- orders;
- B2B authority;
- collector ownership/tracker state;
- rarity/edition truth;
- preorder/release state.

## Initial CI finding and correction

Initial implementation head:

`f335b203318633214839c4fa0092b43365f0d8f9`

GitHub **CI #2054 / Actions run `34321382261`** produced:

- security audit: PASS;
- customer baseline guard: PASS;
- quality: **200 test files / 1348 tests PASS**;
- TypeScript: FAIL.

Exact compiler error:

`tests/storefront-loot-vault-template.test.tsx(17,882): error TS1005: '}' expected.`

Cause: one missing JSX closing brace in the Home renderer regression test.

No engine contract, authority boundary, runtime validation or test expectation was weakened.

Correction commit:

`75d077ca867446b0c4e415ac2da2b3584400ecfc`

Message:

`Fix Loot Vault renderer test JSX closure`

## Corrected implementation CI evidence

Corrected implementation head:

`75d077ca867446b0c4e415ac2da2b3584400ecfc`

GitHub **CI #2055 / Actions run `34321525406`: SUCCESS**.

Verified:

- security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1348 tests PASS**;
- TypeScript: PASS;
- GitHub production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 20 introduces no baseline migration.

Corrected implementation release manifest:

- version: `v24`
- SHA: `75d077ca867446b0c4e415ac2da2b3584400ecfc`
- ref: `feature/storefront-loot-vault-wave20`
- environment: `ci`
- release hash: `41f37b15d310ba3b4bf9b9498cf3a69c45be60cf5da745899d40033041b9bed8`

The GitHub production-build step is compilation/evidence only and is not a Vercel/Supabase deployment.

Existing repository Supabase Edge-runtime and autoprefixer messages remain non-blocking warnings and were not introduced by Loot Vault.

## Implementation diff evidence

Compared with exact Playroom final head `3d62a1da93d10b89ff855a86ee1971ab4dd6fea7`, corrected implementation head `75d077ca867446b0c4e415ac2da2b3584400ecfc` is:

- 2 commits ahead;
- 0 behind;
- 5 added files;
- 0 deletions;
- 76 additions.

Implementation files:

- `src/lib/builder/templates/loot-vault.ts`
- `tests/storefront-loot-vault-template.test.tsx`
- `public/storefront-demo/loot-vault/vault.svg`
- `public/storefront-demo/loot-vault/promo.svg`
- `public/storefront-demo/loot-vault/hunt.svg`

No SQL/customer-baseline or pre-existing product/pricing/inventory/order authority file is modified.

## Explicit no-deploy rule

Wave 20 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging mutation;
- Supabase production mutation;
- production migration.

Deployment remains deferred until the active template-wave sequence is complete and can be handled as one controlled release candidate.

## Explicit non-scope

Wave 20 does not implement:

- a new Loot/drop/preorder engine;
- E9 as preorder/drop authority;
- E8 Context Profile as a fake collection tracker;
- Collection Tracker v1;
- owned-collection persistence;
- collection value/completeness authority;
- loot-box/gambling mechanics;
- fake scarcity/countdowns;
- fake rarity/exclusivity/numbering/preorder/release state;
- a second structured-product registry;
- new price/inventory/order authority;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 20 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Playroom / PR #142 and verified mergeable.
