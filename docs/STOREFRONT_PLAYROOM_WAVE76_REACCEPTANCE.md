# Storefront Wave 76 — Playroom Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 76 is **Playroom (`gaming.playroom` v1) Re-acceptance & Builder Hardening**, stacked directly on the exact accepted Wave 75 Spec Lab head `3472509f195a9307f3ea4ef234176edafe7b5662`.

This successor is repository-derived rather than inferred from numbering. The proven chains are:

- original: Wave 18 / PR #141 Spec Lab → Wave 19 / PR #142 Playroom → Wave 20 Loot Vault;
- historical re-acceptance: Wave 37 / PR #208 Spec Lab → Wave 38 / PR #210 Playroom → Wave 39 Loot Vault;
- current-baseline replay: Wave 56 / PR #258 Spec Lab → Wave 57 / PR #259 Playroom → Wave 58 Loot Vault;
- current replay: Wave 75 / PR #287 Spec Lab → Wave 76 Playroom → Wave 77 Loot Vault candidate.

There is no Storefront release/reconciliation checkpoint between Spec Lab and Playroom in these chains.

## Exact stack boundary

- parent branch: `feature/storefront-spec-lab-wave75`;
- exact parent SHA: `3472509f195a9307f3ea4ef234176edafe7b5662`;
- parent Draft PR: #287;
- Wave 76 branch: `feature/storefront-playroom-wave76`;
- no rebase/import from moving `main`;
- no production promotion;
- Visual Builder and other parallel product work remains external to this stacked wave.

At Wave 76 reconstruction time, `main` had independently advanced to `04c091083947c91d7fbc0e70e4e0941d2ad7b90b` through Visual Builder mobile polish. That movement is intentionally not imported into the Storefront wave stack.

## Provenance and drift

### Original implementation — Wave 19 / PR #142

- template key: `gaming.playroom`;
- version: `1`;
- corrected final accepted HEAD: `3d62a1da93d10b89ff855a86ee1971ab4dd6fea7`;
- original canonical `playroom.ts` blob: `40cf2c9445e58848a9c37e3bfbe6610fd2d47a46`.

### Historical hardened re-acceptance — Wave 38 / PR #210

- final accepted HEAD: `d884d80686ccb6793eb74a486488d631b797bd01`;
- accepted canonical blob: `c37c2bcd3d34699ca6903c8a1957d1f116c9624e`.

### Current-baseline hardened counterpart — Wave 57 / PR #259

- final accepted HEAD: `d385550d92b2c85b1672b824407076662fffd0fb`;
- accepted canonical blob: `c37c2bcd3d34699ca6903c8a1957d1f116c9624e`;
- canonical `playroom.ts` was unchanged by Wave 57.

### Current Wave 75 parent

`src/lib/builder/templates/playroom.ts` at exact Wave 75 HEAD has blob:

`c37c2bcd3d34699ca6903c8a1957d1f116c9624e`

Therefore:

- original Wave 19 → Wave 38 contains proven historical hardening drift;
- Wave 38 → Wave 57 is byte-identical;
- Wave 57 → Wave 75 parent is byte-identical;
- **no current Playroom implementation drift exists**;
- Wave 76 must not manufacture canonical template churn.

## Inherited historical hardening

Wave 38 corrected the inherited Playroom package while preserving shared authority. Wave 57 re-proved those corrections on the then-current runtime, and Wave 76 inherits them unchanged:

1. unsupported Home `compatibility.evidence` was removed while the supported `compatibility.status` surface remained;
2. unsupported Product `compatibility.status` was removed while supported `compatibility.evidence` remained;
3. duplicate Catalog node IDs were corrected to stable page-local unique IDs;
4. unsupported Content editorial presentation was replaced by the shared Content-compatible `editorial.split-feature` surface;
5. no shared binding namespace was added;
6. no component registry/runtime allowlist/Page Schema allowlist was widened;
7. the historical patch is not replayed automatically because the current canonical blob already contains the corrections.

## Canonical identity and visual DNA

Playroom remains:

**playful console discovery × graphic premium gaming × platform-first navigation × social play commerce**

Protected visual direction:

- midnight indigo and soft ink-violet base;
- warm ivory surfaces/text;
- controlled coral and electric cobalt accents;
- limited lime highlight use;
- bold rounded geometric display sans;
- clean interface sans and compact support sans;
- graphic panels and playful geometry;
- platform tiles and genre rooms;
- social-play imagery, consoles, games, controllers and accessories;
- controlled motion language rather than generic RGB/neon noise.

Playroom stays materially distinct from Spec Lab. Spec Lab is a specialist technical decision/comparison/system-fit environment; Playroom is broad gaming and console discovery organized around platforms, genres and social play.

The locked discovery path remains:

`Válassz platformot → Nézd meg az újdonságokat → Találd meg a játékot → Játssz együtt → Egészítsd ki`

The Home order remains:

1. Playroom Hero
2. Shop by Platform
3. New & Noteworthy
4. Game Finder
5. Play Together
6. Genre Rooms
7. Accessories by Platform
8. Platform Match
9. Editor’s Picks
10. Guides & Reviews
11. Footer

## Shared engine and commerce authority

The full experience remains bound to shared engines:

- E1 — Storefront Runtime / Page Schema;
- E2 — catalog, search, channel and product eligibility authority;
- E3 — Guided Finder guidance/ranking over E2-eligible products only;
- E6 — explainable compatibility evidence, fail-closed where Unknown is not Compatible;
- E7 — structured product/platform/genre/player truth;
- E10 — editorial/read-model presentation;
- E13 — provider-neutral checkout and final server validation.

The template owns no product eligibility, product identity, price, compare-at price, inventory, variant, review, recommendation, compatibility, structured-product, customer, order, checkout or payment authority.

Playroom does not introduce PC-build/configurator authority and does not absorb Loot Vault collector/drop authority. Loot boxes, gambling mechanics, odds, fabricated countdowns, fabricated ratings/reviews, fabricated platform support or compatibility, and fabricated scarcity are out of scope.

## Page Schema and Builder compatibility

All 14 existing Alap-compatible presets remain required:

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

Builder hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Required invariants:

- Desktop / Tablet / Mobile support remains active;
- node IDs remain page-local unique;
- only existing shared binding namespaces may be used;
- `system.*` and `story.*` legacy namespaces remain forbidden;
- no shared runtime allowlist widening;
- no component registry widening;
- no binding namespace widening;
- no Page Schema allowlist widening;
- no template-local Builder engine.

The accepted Product composition remains 7/5 on Desktop and Tablet, stacking to 12/12 on Mobile:

- `playroom-product-gallery`: D 7 / T 7 / M 12;
- `playroom-product-buybox`: D 5 / T 5 / M 12.

## Installation and demo safety

Playroom remains:

- `gaming.playroom` v1;
- minimum plan `alap`;
- demo namespace `gaming-playroom`;
- draft-only installation;
- 14 Page Schema presets;
- Desktop/Tablet/Mobile compatible.

Template installation may mutate storefront page drafts only. Products, variants, pricing, inventory, customers, orders and B2B authority remain immutable from template installation.

Demo fixtures remain non-authoritative and must not fabricate release dates/countdowns, rating/review scores, platform support, compatibility truth, guaranteed/fixed pricing, stock counts, gambling/loot-box mechanics or scarcity.

## Minimal Wave 76 batch

Because the current Wave 75 parent source is byte-identical to Wave 38 and Wave 57 accepted canonical Playroom source, Wave 76 contains only three new files in one coherent commit:

1. this evidence/reconstruction document;
2. `src/lib/builder/templates/playroom-wave76-acceptance.ts`;
3. `tests/storefront-playroom-wave76-reacceptance.test.ts`.

`src/lib/builder/templates/playroom.ts` is deliberately unchanged.

No shared runtime, renderer registry, component registry, binding namespace, Page Schema, SQL/customer-baseline, payment or tenant file is changed.

## Closure gate

Wave 76 closes only if exact-head evidence proves:

- customer database baseline guard PASS;
- Block 24 market-ready contract PASS;
- full quality suite PASS;
- Wave 76 targeted acceptance PASS;
- Wave 57 current-baseline counterpart PASS;
- Wave 38 historical counterpart PASS;
- Wave 75 Spec Lab predecessor PASS;
- TypeScript PASS;
- production Next.js build PASS;
- production dependency security audit PASS;
- release manifest generation/upload PASS.

Fresh Install Proof remains **SKIPPED** when no customer-baseline/schema change exists; it must not be reported as PASS.

The Git-integrated exact-head Vercel preview must be READY and carry the exact Wave 76 branch/SHA metadata. Deployment Protection must not be weakened merely to force anonymous preview health. If preview `/api/health` is protected and returns redirect/authentication rather than application health, it is reported as blocked/not proven rather than PASS.

## Explicit non-scope

No `main` merge; no rebase onto moving `main`; no production promotion; no production/staging/Fresh Install Supabase mutation; no Water-K or storefront revision reconciliation; no customer-baseline change without schema evidence; no K&H/vPOS/payment authority change; no Visual Builder / Email Builder / Template Library UX / Roadmap import; no shared runtime/renderer/registry/binding/Page Schema widening; no template-local gaming, Finder, compatibility, structured-product, layout, pricing, inventory, checkout or payment engine; no PC-configurator duplication; no collector/drop authority; no gambling/loot-box mechanics; no fabricated commerce/product truth; no Wave 77 implementation.
