# Storefront Scale-out Wave 17 — Creator Station

## Purpose

Wave 17 implements **Creator Station** directly on top of Table & Gift / PR #139.

- Template key: `tech.creator-station`
- Template version: `1`
- Category metadata: `electronics-tech`
- Base branch: `feature/storefront-table-gift-wave16`
- Base final head: `864b1bac40066b6f0e458644104400ca41d45ba7`
- Accepted implementation head: `2963a0b536df1e503bfa10cea008070c39afea0a`

This is a code-only storefront scale-out wave. It introduces no SQL migration, customer-baseline mutation, live storefront route switch, payment change, Vercel/Supabase deployment or Water-K tenant-status change.

Per the current release discipline, **individual template waves are not deployed**. The active template-wave sequence will later be handled as one controlled release candidate.

## Recovered template identity

Creator Station is the previously accepted **Elektronika & Tech #2** template.

It is **not** the unrelated warm-paper / maker-workshop concept that had appeared in older naming context. The authoritative direction for this wave is the creator-technology workflow experience:

**dark digital creator workflow commerce × setup building × explainable compatibility × creator education**

Primary use cases:

- YouTube;
- Podcast;
- Stream;
- Fotó;
- Short Video;
- Home Studio.

The template is designed around connected creator equipment and workflows rather than around isolated product cards or a generic SaaS dashboard.

## Visual DNA

Palette:

- deep graphite / charcoal background;
- neutral dark panels;
- cool-white typography;
- controlled cyan primary accent;
- controlled magenta/violet secondary accent;
- REC/warning orange-red;
- compatibility signal green.

Typography:

- technical grotesk/sans display;
- clean sans interface typography;
- monospaced timecode/data accents.

Visual language:

- timeline;
- waveform;
- timecode;
- audio meters;
- port/node relationships;
- connection chains.

Imagery:

- camera;
- lens;
- lighting;
- microphone/audio;
- capture devices;
- computer;
- creator software;
- complete desk/mobile/studio workflow scenes.

Explicit exclusions:

- white background content blocks;
- sterile SaaS styling;
- cold generic tech dashboards;
- uncontrolled RGB/gamer chaos;
- fabricated compatibility;
- fabricated performance guarantees.

The no-white-background rule is regression-tested against the Home Page Schema and locked into the visual contract.

## Current engine resolution

Older Creator Station planning notes used partially inconsistent engine labels. Wave 17 resolves the template against the **actual current Shoporation engine meanings already implemented in the repository**, rather than inventing or reviving a second overlapping system.

Required full experience:

`E1 + E2 + E3 + E5 + E6 + E7 + E10 + E13`

### E1 — Runtime

Shared Page Schema / component-registry / responsive runtime authority.

### E2 — Product Discovery

Authoritative catalog/channel eligibility remains outside the template. Creator Station can organize and rank eligible products but cannot make hidden/ineligible products purchasable.

### E3 — Guided Finder

Owns **Build Your Workflow** guidance:

- creator use case;
- goal/preferences;
- structured workflow selection;
- explainable product/discovery assistance.

It does not create products, override price/stock or create a cart/order.

### E5 — Product Configurator

Owns the **slot-based creator setup** model.

Typical slots may include:

- Camera;
- Lens;
- Light;
- Microphone;
- Capture;
- Computer;
- Software.

E5 is used instead of introducing a second Creator-specific setup or bundle engine.

### E6 — Compatibility

Owns explainable device/workflow compatibility.

Locked principles:

- Unknown is never Compatible;
- compatibility must be explainable;
- final validation is server-authoritative;
- no silent replacement/substitution.

### E7 — Structured Product / Compare & Spec

Provides:

- System Requirements;
- I/O and port data;
- technical product specifications;
- structured comparison inputs;
- catalog facets.

Creator Station does not create a second technical-attribute registry.

### E10 — Editorial / Story

Creator Magazine/tutorial content is conceptually sourced from the existing editorial/story authority.

Wave 17 does not add another storytelling engine or template-specific runtime branch. Home presentation uses shared editorial components; editorial content authority remains outside template-switch ownership.

### E13 — Checkout

Final cart/checkout validation remains provider-neutral and server-authoritative.

Authority rule:

`workflow-guidance-and-setup-presentation-never-invent-price-stock-compatibility-performance-or-order-authority`

## Existing registry composition

No Creator Station-specific renderer branch is introduced.

The existing `createStorefrontConfiguratorComponentRegistry()` chain already composes the reusable structured product, Guided Finder and Configurator/Compatibility component families needed by this template.

The matching shared renderer registry provides the same component-key/version driven rendering path.

This preserves Builder compatibility and avoids hardcoding behavior based on `tech.creator-station`.

## Exact Home composition

The accepted Home sequence is locked in metadata and regression tests:

1. Build Your Workflow
2. Visual Equipment Chain
3. Timeline
4. Setup Scenes
5. Compatibility Checker
6. System Requirements
7. Starter / Advanced / Studio
8. Creator Magazine
9. Footer

No extra standalone white hero/content block is inserted before this flow.

### Build Your Workflow

Uses `guided.finder` from E3.

Workflow examples:

- YouTube;
- Podcast;
- Stream;
- Fotó;
- Short Video;
- Home Studio.

### Visual Equipment Chain

Uses `configurator.slot-list` to display the connected creator setup as slots/read-model state.

### Timeline

Uses a shared Configurator presentation component to show ordered workflow/signal steps supplied through bindings.

Representative journey:

`Camera → Lens → Light → Microphone → Capture → Computer → Software`

The exact chain remains data-driven.

### Setup Scenes

Uses common collection navigation for creator contexts such as desk, mobile or studio setups.

### Compatibility Checker

Uses `compatibility.status` from E6.

Unknown evidence remains explicitly Unknown and cannot be presented as Compatible.

### System Requirements

Uses E7 structured key specs.

Missing technical evidence remains missing rather than being inferred from template copy.

### Starter / Advanced / Studio

Uses a shared structured compare spotlight.

These are presentation/comparison tiers only. The template does not fabricate fixed setup prices, FPS, latency or performance guarantees.

### Creator Magazine

Uses shared editorial preview presentation and remains bound to editorial/story read models.

Tutorial/editorial presentation cannot override technical compatibility or commerce authority.

## Catalog and search

Catalog:

- workflow-oriented guided navigation;
- E7 structured facets;
- common product grid;
- E2 remains visibility/eligibility authority.

Search:

- E3 guided result explanation;
- E2 search/product result authority.

## Product page

Desktop/tablet:

- gallery: 7/12;
- buybox: 5/12.

Mobile:

- gallery and buybox: 12/12.

PDP includes:

- common gallery;
- common product information;
- generic option selector;
- E7 `Creator Specs`;
- compare action;
- standard purchase CTA;
- E7 `System & I/O Specifications`;
- E6 compatibility evidence for the active workflow/setup;
- common recommendations.

The PDP cannot infer supported ports, codecs, resolutions or compatibility without authoritative evidence.

## Cart

Cart can display:

- E5 configuration summary;
- common cart summary.

The configuration summary does not replace real cart lines or become pricing/inventory authority.

Before checkout, current price, stock, channel eligibility and compatibility require normal server revalidation.

## Checkout

Checkout is bound to **E13**.

It remains provider-neutral and contains no:

- K&H-specific template logic;
- vPOS credential;
- payment secret;
- merchant identifier.

The GitHub production-build CI step is compilation only and is not a deployment.

## Account

Account may present an existing setup/configuration summary.

A saved setup is not a promise of current:

- price;
- stock;
- product eligibility;
- compatibility.

Current commerce/compatibility evidence must be refreshed before purchasing.

## Content / Creator Workflow Builder

Content role:

`creator-workflow-builder`

Engine binding:

`E3+E5+E6+E7`

The content preset combines:

- workflow Finder;
- setup builder;
- compatibility status;
- criterion-level compatibility evidence.

It does not introduce a Creator-specific persistence or commerce authority.

## Page package

Creator Station ships 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Creator Workflow Builder
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Minimum plan:

`alap`

Demo namespace:

`tech-creator-station`

## Demo content

Namespaced fixtures:

- collection `youtube-workflow`;
- collection `podcast-workflow`;
- product `creator-camera`;
- product `creator-audio-interface`;
- content `signal-chain-guide`.

Deterministic local media:

- `public/storefront-demo/creator-station/timeline.svg`
- `public/storefront-demo/creator-station/setup.svg`
- `public/storefront-demo/creator-station/magazine.svg`

Demo/test coverage rejects fabricated compatibility state, fixed setup-price authority and guaranteed FPS/latency claims.

## Builder compatibility

Creator Station is native to the existing Builder/runtime foundation:

- Template Manifest;
- Page Schema presets;
- component-key/version registry;
- shared Finder/Configurator/Compatibility/Structured Product components;
- responsive configuration;
- safe binding paths;
- namespaced demo lifecycle;
- draft-only template installation.

No actual drag/drop Visual Builder UI is introduced in this wave. That remains in the later Visual Builder roadmap block.

## Template-install mutation boundary

Template installation/switching remains presentation-only:

- storefront Page Schema drafts: allowed;
- products: no mutation;
- variants: no mutation;
- customers: no mutation;
- orders: no mutation;
- B2B authority: no mutation.

Finder, Configurator, Compatibility, structured product data, story documents and commerce authorities remain outside template-switch mutation ownership.

## Implementation diff evidence

Compared with Table & Gift final head `864b1bac40066b6f0e458644104400ca41d45ba7`, implementation head `2963a0b536df1e503bfa10cea008070c39afea0a` is:

- 1 commit ahead;
- 0 behind;
- 5 added files;
- 0 deletions.

Implementation files:

- `src/lib/builder/templates/creator-station.ts`
- `tests/storefront-creator-station-template.test.tsx`
- `public/storefront-demo/creator-station/timeline.svg`
- `public/storefront-demo/creator-station/setup.svg`
- `public/storefront-demo/creator-station/magazine.svg`

No SQL/customer-baseline or pre-existing product/pricing/inventory/order authority file is modified.

## Implementation CI evidence

Accepted implementation head:

`2963a0b536df1e503bfa10cea008070c39afea0a`

GitHub **CI #2043 / Actions run `34316600511`: SUCCESS**.

Verified:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **200 test files / 1345 tests PASS**;
- TypeScript: PASS;
- GitHub production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 17 introduces no baseline migration.

Implementation release manifest:

- version: `v24`
- SHA: `2963a0b536df1e503bfa10cea008070c39afea0a`
- ref: `feature/storefront-creator-station-wave17`
- environment: `ci`
- release hash: `3c4f7fcd665576a751e9d8ac55b6eaefa32f5eac621adbb428f4822bd68f5626`

Existing repository build warnings about Supabase Edge-runtime APIs and old CSS autoprefixer usage remain warnings only; they are pre-existing and are not introduced by Creator Station.

## Explicit no-deploy rule

Wave 17 does not trigger or authorize:

- Vercel Preview deployment;
- Vercel production deployment;
- Supabase staging mutation;
- Supabase production mutation;
- production migration.

Deployment remains deferred until the active template-wave sequence is complete and can be released as one controlled candidate.

## Explicit non-scope

Wave 17 does not implement:

- a new Creator engine;
- a second Configurator/Composer system;
- a second technical-specification registry;
- black-box compatibility scoring;
- automatic/silent substitution;
- guaranteed FPS/latency/quality claims;
- new price/inventory/order authority;
- Creator-specific persistence tables;
- Visual Builder drag/drop UI;
- SQL/customer-baseline migration;
- live storefront route switch;
- staging/production mutation;
- production deploy;
- payment/K&H/vPOS change;
- Water-K tenant status change.

## Closure rule

Wave 17 is fully closed only after this documentation HEAD passes full branch CI and a stacked Draft PR is created directly on Table & Gift / PR #139 and verified mergeable.
