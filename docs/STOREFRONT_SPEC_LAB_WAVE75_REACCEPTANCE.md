# Storefront Wave 75 — Spec Lab Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 75 is **Spec Lab (`tech.spec-lab` v1) Re-acceptance & Builder Hardening**, stacked directly on the exact accepted Wave 74 Creator Station head `113ee9ca98e965e4531cb27a60a0d9af08be8da9`.

The successor is repository-derived, not inferred from numbering.

Authoritative chains:

- original: Wave 17 / PR #140 Creator Station → Wave 18 / PR #141 Spec Lab;
- historical re-acceptance: Wave 36 / PR #198 Creator Station → Wave 37 / PR #208 Spec Lab;
- current-baseline hardened replay: Wave 55 / PR #257 Creator Station → Wave 56 / PR #258 Spec Lab;
- current replay: Wave 74 / PR #286 Creator Station → Wave 75 Spec Lab.

Exact predecessor boundaries:

- PR #141 base `feature/storefront-creator-station-wave17@dbc16e8895d47f791453b52df87f1954afbee43e`;
- PR #208 base `feature/storefront-creator-station-wave36@f6e75853f90c3e0579407e6dfcd72488b5bf50ab`;
- PR #258 base `feature/storefront-creator-station-wave55@b4777db050419322fd5e8f948c929192518d1cec`;
- Wave 75 base `feature/storefront-creator-station-wave74@113ee9ca98e965e4531cb27a60a0d9af08be8da9`.

The original and replay chains continue from Spec Lab to Playroom. There is no Storefront release/reconciliation checkpoint between Creator Station and Spec Lab.

## Exact stack boundary

- parent branch: `feature/storefront-creator-station-wave74`;
- exact parent SHA: `113ee9ca98e965e4531cb27a60a0d9af08be8da9`;
- parent Draft PR: #286;
- Wave 75 branch: `feature/storefront-spec-lab-wave75`;
- no `main` rebase/import;
- no production promotion;
- parallel Builder, Email Builder, Template Library UX and Roadmap work remains external.

## Provenance and drift

### Original implementation — Wave 18 / PR #141

- template key: `tech.spec-lab`;
- version: `1`;
- legacy working name: `Tech Command`;
- accepted implementation HEAD: `a02404a65b8a370c086f26d932ba3f3d1154444a`;
- final accepted/documentation HEAD: `c8a3324e93964b12247308f0e870824ee8cb94fc`;
- original final canonical blob: `f5eae31807a0e916c61f7d68c76584d94e76dc1d`.

### Historical re-acceptance — Wave 37 / PR #208

- exact base: Creator Station Wave 36 `f6e75853f90c3e0579407e6dfcd72488b5bf50ab`;
- final accepted HEAD: `a18e4b50583cc22bd7a9dde581afa7a7d0726870`;
- accepted canonical blob: `172a065cba30db10dac993695be1ba1831bf986d`.

### Current-baseline hardened counterpart — Wave 56 / PR #258

- exact base: Creator Station Wave 55 `b4777db050419322fd5e8f948c929192518d1cec`;
- final accepted HEAD: `eed5852cb6077d6b9c5e564859ba823317e25dcf`;
- accepted canonical blob: `172a065cba30db10dac993695be1ba1831bf986d`;
- canonical `spec-lab.ts` unchanged by Wave 56.

### Current Wave 74 parent

`src/lib/builder/templates/spec-lab.ts` at exact Wave 74 HEAD has blob:

`172a065cba30db10dac993695be1ba1831bf986d`

Therefore:

- original Wave 18 → historical Wave 37: historical hardening drift exists;
- Wave 37 accepted → Wave 56 accepted: byte-identical;
- Wave 56 accepted → Wave 74 parent: byte-identical;
- no current implementation drift is proven;
- Wave 75 must not manufacture canonical template churn.

## Historical hardening drift

Wave 37 corrected and completed the inherited Spec Lab contract without widening shared authority:

1. added the Builder hardening contract;
2. corrected legacy `system.*` read-model bindings to the existing shared `product.*` structured-product namespace;
3. corrected legacy `story.*` editorial bindings to existing allowlisted `content.*` presentation bindings;
4. completed E2/E3 discovery and Guided Finder presentation surfaces;
5. completed E5 configurator/setup surfaces;
6. retained E6 explainable compatibility where Unknown is never Compatible;
7. retained E7 structured product, comparison and system-requirements truth;
8. retained E10 Tech Magazine/editorial presentation;
9. kept Trade-in as an integration hook only, with no valuation or lifecycle authority;
10. kept Product 3D as an external viewer hook only, with no template-owned 3D engine;
11. retained all 14 Alap Page Schema presets and Desktop/Tablet/Mobile support;
12. retained provider-neutral E13 checkout and final server validation;
13. widened no runtime allowlist, component registry, binding namespace or Page Schema authority.

Wave 56 re-proved the same hardened source against its then-current baseline and made no canonical template change. Wave 75 inherits the exact same blob.

## Canonical identity

Spec Lab remains:

**dark-navy specialist technical decision lab × comparison × specification evidence × system fit commerce**

Protected visual DNA:

- deep navy background;
- technical navy panels;
- cool ivory-white text;
- controlled orange/ochre primary accent;
- muted steel-blue secondary accent;
- signal-green compatibility state;
- amber caution state;
- strong technical sans display typography;
- clean sans interface typography;
- monospaced specification labels;
- spec grids, comparison rails, compatibility nodes, Finder paths, system maps and decision evidence.

It remains materially distinct from Creator Station: Spec Lab is a specialist product-decision and system-fit environment, not a creator signal-chain/workflow setup experience.

Explicit exclusions remain generic gamer RGB, neon-rainbow styling, white-background drift, fabricated specifications, fabricated compatibility and fabricated performance guarantees.

## Decision path and exact Home contract

The locked decision path remains:

`Mit keresel? → Mire használod? → Hasonlítsd össze → Tech Finder → Építsd fel a szetted`

The exact Home order remains:

1. Mit keresel?
2. Mire használod?
3. Hasonlítsd össze
4. Tech Finder
5. Építsd fel a szetted
6. Compatibility Matrix
7. System Requirements
8. Accessory Matcher
9. Trade-in
10. Tech Magazine
11. Footer

## Shared engine and authority boundary

Required full experience remains:

- E1 — shared Storefront Runtime / Page Schema;
- E2 — catalog/search/channel eligibility authority;
- E3 — Guided Finder guidance/ranking only;
- E5 — configurator/setup intent and read models;
- E6 — explainable compatibility;
- E7 — structured product/specification/comparison truth;
- E10 — Tech Magazine/editorial presentation;
- E13 — provider-neutral checkout/final validation.

The template owns no product eligibility, SKU identity, price, compare-at price, inventory, variant, review, recommendation, compatibility, structured-product, Trade-in valuation, 3D geometry, customer, order, B2B, checkout or payment authority.

Compatibility remains fail-closed: Unknown is never Compatible, evidence remains explainable, final validation remains server-authoritative and silent substitution is prohibited.

Missing authoritative data remains empty/null rather than being inferred from marketing copy.

## Page Schema and Builder compatibility

All 14 presets must validate on the current shared runtime:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Spec Lab Builder
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Required focused coverage includes Home, Catalog, Search, Product, Content, Blog Index, Blog Article and Checkout.

Builder hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Node IDs stay page-local unique. Only existing shared binding namespaces are valid. No Page Schema allowlist, component registry or binding namespace widening is permitted to rescue legacy content.

## Actual responsive PDP contract

Wave 75 asserts actual nodes, not metadata-only claims:

- `spec-product-gallery`: desktop 7/12, tablet 7/12, mobile 12/12;
- `spec-product-buybox`: desktop 5/12, tablet 5/12, mobile 12/12.

Product gallery, product name, pricing, inventory, variants, key specs, grouped specifications, purchase target and accessory recommendations remain shared-authority bindings.

## Trade-in, 3D and media authority

Trade-in remains a guarded integration link only. The template cannot calculate value, approve a trade, persist a trade lifecycle, or influence checkout truth.

Product 3D remains an external viewer link only. The template owns no geometry pipeline, asset-generation authority or 3D commerce engine.

Marketing/demo media may illustrate specialist technology use cases but may not bake authoritative price, stock, compatibility, technical specifications, benchmark/performance claims, Trade-in value, rating/review count, checkout/payment state, or editable business-critical CTA truth.

## Installation and demo safety

Spec Lab remains:

- `tech.spec-lab` v1;
- legacy working name `Tech Command`;
- minimum plan `alap`;
- demo namespace `tech-spec-lab`;
- draft-only installation;
- 14 Page Schema presets;
- Desktop/Tablet/Mobile compatible.

Template installation may mutate storefront page drafts only. Products, variants, pricing, inventory, customers, orders and B2B authority remain immutable from template installation.

Demo fixtures remain non-authoritative and may not fabricate compatibility, performance, Trade-in value, fixed setup prices, guaranteed stock or scarcity.

## Read-only Wave 75 starting baseline

At Wave 75 start:

- `main`: `d697607a160ebd42baa8b8cadde744c6ab3e1cc7`;
- Wave 74 exact parent: `113ee9ca98e965e4531cb27a60a0d9af08be8da9`;
- PR #286: open, Draft, unmerged and mergeable;
- production deployment: `dpl_J5irEMfggUedHdpYHF7htKNN448z`, READY, target `production`, exact Git SHA `d697607a160ebd42baa8b8cadde744c6ab3e1cc7`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d697607a160e`;
- Supabase `waterk-platform`: ACTIVE_HEALTHY;
- `waterk-staging`: ACTIVE_HEALTHY;
- `Shoperation Fresh Install`: INACTIVE;
- Water-K: `water-k`, `pilot`, `pro`, 1 product, 3 variants, 8 orders, 14 storefront pages, 71 revisions;
- customer baseline blob `60b6705ec860849c563f6832460e3c7996f4e433`, `status=ready`, `sourcePolicy=schema-snapshot-only`, `defaultPlan=alap`, `freshInstallProofRequired=false`, proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

The 71-revision state is inherited from parallel Builder/template activity observed before Wave 75 implementation. Wave 75 does not reconcile it.

## Minimal Wave 75 batch

Because the current canonical source is byte-identical to Wave 37 and Wave 56 accepted source, Wave 75 contains exactly three new files in one coherent commit:

1. this evidence/reconstruction document;
2. `src/lib/builder/templates/spec-lab-wave75-acceptance.ts`;
3. `tests/storefront-spec-lab-wave75-reacceptance.test.ts`.

No canonical template, shared runtime, component registry, binding namespace, Page Schema, SQL/customer-baseline, payment or tenant file is changed.

## Closure gate

Wave 75 closes only if exact-head CI proves customer baseline guard, full quality suite, Wave 75 targeted acceptance, Wave 56 current-baseline counterpart, Wave 37 historical counterpart, Wave 74 Creator Station predecessor, TypeScript, production Next.js build, security audit and release manifest all PASS.

Fresh Install proof remains SKIPPED when no customer-baseline/schema change exists.

Quality and release artifacts must both exist, their GitHub SHA-256 digests must be recorded, both ZIP archives must be independently downloaded and locally recomputed, release manifest SHA must equal exact Wave 75 HEAD, and releaseHash must be recorded.

The Git-integrated Vercel preview must be READY, `target:null`, and carry exact Wave 75 SHA/branch/PR metadata. Deployment Protection is not weakened and no bypass/share URL is created merely to force an anonymous health PASS.

## Explicit non-scope

No `main` merge; no rebase onto moving `main`; no production promotion; no production/staging/Fresh Install Supabase mutation; no Water-K mutation or revision reconciliation; no customer-baseline change without schema evidence; no K&H/vPOS/payment authority change; no Visual Builder / Email Builder / Template Library UX / Roadmap import; no shared runtime/registry/binding/Page Schema widening; no template-local Finder, Configurator, Compatibility, Structured Product, layout, pricing, inventory, Trade-in valuation, 3D, checkout or payment authority; no Wave 76 implementation.
