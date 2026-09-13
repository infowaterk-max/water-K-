# Storefront Wave 73 — Table & Gift Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 73 is **Table & Gift (`food.table-gift` v1) Re-acceptance & Builder Hardening**, stacked directly on the exact accepted Wave 72 Gallery Edit head `6b83a2e472c029166be839be16c4553dffaedfcf`.

The successor is repository-derived, not inferred from numbering.

Authoritative chains:

- original: Wave 15 / PR #138 Gallery Edit → Wave 16 / PR #139 Table & Gift;
- historical re-acceptance: Wave 34 / PR #194 Gallery Edit → Wave 35 / PR #195 Table & Gift;
- current-baseline hardened replay: Wave 53 / PR #254 Gallery Edit → Wave 54 / PR #255 Table & Gift;
- current replay: Wave 72 / PR #284 Gallery Edit → Wave 73 Table & Gift.

Exact predecessor boundaries:

- PR #139 base `feature/storefront-gallery-edit-wave15@96f74bac17443f0c733f089da8decad3d13ecd11`;
- PR #195 base `feature/storefront-gallery-edit-wave34@ad2709286200692d3f39c51e77c019c0fec0c948`;
- PR #255 base `feature/storefront-gallery-edit-wave53@9d0b065e2758dd9e746b496bfa57b1e1733b007d`;
- Wave 73 base `feature/storefront-gallery-edit-wave72@6b83a2e472c029166be839be16c4553dffaedfcf`.

There is no Storefront release/reconciliation checkpoint between Gallery Edit and Table & Gift in any authoritative replay chain. Original Wave 17 / PR #140 and historical Wave 36 / PR #198 continue directly with Creator Station, confirming the ordering.

## Exact stack boundary

- parent branch: `feature/storefront-gallery-edit-wave72`;
- exact parent SHA: `6b83a2e472c029166be839be16c4553dffaedfcf`;
- parent Draft PR: #284;
- Wave 73 branch: `feature/storefront-table-gift-wave73`;
- Wave 73 Draft PR base: `feature/storefront-gallery-edit-wave72`;
- no `main` rebase/import;
- no production promotion;
- parallel Template Library / Builder / Email Builder / Roadmap work remains external.

## Provenance

### Original implementation — Wave 16 / PR #139

- template key: `food.table-gift`;
- version: `1`;
- original implementation HEAD: `d0cbdfc64fb94b53f8b1bba8c8246933f9f9d475`;
- original final documentation HEAD: `864b1bac40066b6f0e458644104400ca41d45ba7`;
- original canonical template blob: `cd9e71509ce0b424b8a540107877db02512b8bee`;
- category: `food-gifting`;
- demo namespace: `food-table-gift`;
- minimum plan: `alap`.

### Historical re-acceptance — Wave 35 / PR #195

- exact base: Gallery Edit Wave 34 `ad2709286200692d3f39c51e77c019c0fec0c948`;
- accepted implementation HEAD: `48deaae5dd31b26be395dec1993de1d6f94f0598`;
- final accepted HEAD: `f83d1f3bfad426ba1a74346ebf3f525798e5669f`;
- accepted canonical template blob: `0147f740a22db23485adf3649bbe5fa0768ca6c9`.

### Current-baseline hardened counterpart — Wave 54 / PR #255

- exact base: Gallery Edit Wave 53 `9d0b065e2758dd9e746b496bfa57b1e1733b007d`;
- final accepted HEAD: `a3f8cda986ebceaf318c9908f66e34fa4f8ffaf2`;
- accepted canonical template blob: `0147f740a22db23485adf3649bbe5fa0768ca6c9`;
- canonical `table-gift.ts` unchanged by Wave 54.

### Current Wave 72 parent

`src/lib/builder/templates/table-gift.ts` at exact Wave 72 HEAD has blob:

`0147f740a22db23485adf3649bbe5fa0768ca6c9`

Therefore:

- original Wave 16 → Wave 35: **historical drift exists**;
- Wave 35 accepted → Wave 54 accepted: byte-identical;
- Wave 54 accepted → Wave 72 parent: byte-identical;
- no current drift is proven;
- Wave 73 must not manufacture canonical template churn.

## Historical hardening drift

Wave 35 changed the canonical implementation in specific ways without widening shared authority:

1. added `TABLE_GIFT_BUILDER_HARDENING_CONTRACT`;
2. completed stable Builder bindings for the shared E3 `guided.finder` surface;
3. completed stable Builder bindings for the shared E4 `composer.builder` surface;
4. made Gift Message and Corporate Gift shared `editorial.split-feature` slots fully merchant-editable;
5. added stable content bindings for Shop by Occasion, Catalog occasion navigation, PDP presentation, E3 explanation, recommendations and cart gift summary;
6. added stable `content.<pageType>.title/copy` bindings to simple page presets;
7. corrected forbidden inherited `checkout.*` presentation bindings to allowlisted `content.checkoutGiftMessage.*` bindings rather than widening the runtime namespace allowlist;
8. retained actual Product Page geometry at gallery 7/7/12 and buybox 5/5/12;
9. retained exact seven-step Home order and explicitly forbade Gift Hero, Gift Story and Reviews additions;
10. retained E1 + E2 + E3 + E4 + E13 only; E10 remains outside the accepted contract.

Wave 54 re-proved the accepted hardened source against the then-current baseline. Its initial failure was a Wave 54 test assumption about a concrete variant binding, not template drift; the canonical source remained unchanged. Wave 73 inherits that exact accepted source.

## Canonical visual and merchandising identity

Table & Gift remains **premium gifting / occasion commerce × curated selection × configurable gifting**.

Protected visual DNA:

- ivory background;
- deep burgundy primary;
- forest green secondary;
- champagne accent;
- black text;
- elegant editorial serif + clean sans UI;
- gift boxes, ribbon, premium table settings and curated food/drink still life;
- generous, refined, celebratory spacing.

It remains materially distinct from Gallery Edit and Market Pantry.

Shopping journey:

`guided gift choice → occasion → curated set → composed gift → gift message → corporate contact / checkout`

Explicit exclusions include Market Pantry duplication, rustic/farmhouse styling, promo chaos, fabricated fixed-price gift boxes, virtual bundle SKUs, fake scarcity and baked marketing copy.

## Exact Home contract

The accepted Home order remains exactly:

1. Gift Builder
2. Shop by Occasion
3. Curated Gift Sets
4. Build Your Gift
5. Gift Message
6. Corporate Gift CTA
7. Footer

The following remain forbidden additions:

- Gift Hero;
- Gift Story;
- Reviews.

There is intentionally no new layered marketing Hero in this template. The accepted Table & Gift contract begins with the shared E3 Gift Builder. Wave 73 does not reshape the template to match Gallery Edit or other templates.

## Shared engine and authority boundary

Required full experience remains:

- E1 — shared Storefront Runtime / Page Schema;
- E2 — shared product discovery and catalog/channel eligibility;
- E3 — shared Guided Finder guidance/ranking only;
- E4 — shared Multi-Product Composer intent over real catalog products;
- E13 — provider-neutral cart/checkout and final commerce revalidation.

**E10 is not part of the accepted Table & Gift contract.**

The template owns no product eligibility, SKU, price, inventory, variant, review, recommendation, bundle-price, customer, order, B2B, checkout, payment or gift-message persistence authority.

Gift Builder can guide only among already-eligible products. Build Your Gift can compose real catalog products but cannot create a virtual bundle SKU or authoritative fixed gift price. Final commerce state is revalidated by shared/server authority.

Missing authoritative data remains empty/null/fail-closed; the template does not fabricate price, stock, scarcity, delivery guarantees, B2B approval or bundle authority.

## Marketing / image authority

Gift Message and Corporate Gift are shared presentation surfaces with independently editable eyebrow, title, copy, image, image alt, CTA label and CTA href bindings.

Demo/marketing media may not bake in authoritative price, stock, availability, rating, review count, fixed bundle price, technical/product facts, corporate approval, delivery guarantees or scarcity. Merchant-editable CTA/copy remains in bindings rather than becoming image authority.

## Page Schema and Builder compatibility

All 14 presets must validate on the current shared runtime:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Gift Builder Hub
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Builder hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Desktop / Tablet / Mobile remain enabled. Node IDs stay page-local unique. Only existing shared binding namespaces are valid. No Page Schema allowlist, component registry or binding namespace widening is permitted to rescue legacy content.

## Actual responsive PDP contract

Wave 73 asserts actual nodes, not metadata:

- `table-gift-product-gallery`: desktop 7/12, tablet 7/12, mobile 12/12;
- `table-gift-product-buybox`: desktop 5/12, tablet 5/12, mobile 12/12.

Product gallery, product name, price/compare-at, inventory label, purchase target, E3 explanation and recommendations remain shared-authority bindings.

A concrete variant selector binding is not invented as a Wave gate requirement. Variant authority remains shared and template-local variant authority remains forbidden.

## Installation and demo safety

Table & Gift remains:

- `food.table-gift` v1;
- minimum plan `alap`;
- demo namespace `food-table-gift`;
- draft-only installation;
- 14 Page Schema presets;
- Desktop / Tablet / Mobile compatible.

Template installation may mutate storefront page drafts only. Products, variants, pricing, inventory, customers, orders and B2B authority remain immutable from template installation.

Demo fixtures must remain claim-neutral and may not fabricate fixed prices, guaranteed stock, limited-time scarcity, virtual bundle SKUs or exclusive pricing.

## Read-only Wave 73 starting baseline

At Wave 73 start:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- Wave 72 parent: `6b83a2e472c029166be839be16c4553dffaedfcf`;
- PR #284: open Draft, unmerged, mergeable;
- Wave 72 exact-head CI run `34627282056`: SUCCESS;
- Wave 72 quality artifact `10274751311`, SHA-256 `2937376c41f318925abc75e40be3f35df8a8fa31b89d1cd46c0300bd88534bd8`;
- Wave 72 release artifact `10273749890`, SHA-256 `1f096a96aa3ed2c88ae2f59d858a52c5be0177bf71448c2c51aec7bee06cef6c`;
- Wave 72 releaseHash `a1509d55378ef31dd47cda018abdfc283492113a1e37bf33c76c2980e8b51ce6`;
- Wave 72 preview `dpl_Ho9W47KXYBHtn9R6Fj8fab2YwhbY`: READY, `target:null`, exact Wave 72 Git metadata;
- production deployment remains `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA` on `main@d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`;
- Supabase `waterk-platform`: ACTIVE_HEALTHY;
- `waterk-staging`: ACTIVE_HEALTHY;
- `Shoperation Fresh Install`: INACTIVE;
- Water-K: `water-k`, `pilot`, `pro`, 1 product, 3 variants, 8 orders, 14 storefront pages, 43 revisions.

Water-K revision movement remains external and is not reconciled in Wave 73.

Customer baseline remains blob `60b6705ec860849c563f6832460e3c7996f4e433`, `status=ready`, `sourcePolicy=schema-snapshot-only`, `defaultPlan=alap`, `freshInstallProofRequired=false`, proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

## Minimal Wave 73 batch

Because the inherited source is byte-identical to Wave 35 and Wave 54 accepted source, Wave 73 contains exactly three new files in one coherent commit:

1. this evidence/reconstruction document;
2. `src/lib/builder/templates/table-gift-wave73-acceptance.ts`;
3. `tests/storefront-table-gift-wave73-reacceptance.test.ts`.

No canonical template, shared runtime, component registry, binding namespace, Page Schema, SQL/customer-baseline, payment or tenant file is changed.

## Closure gate

Wave 73 closes only if exact-head CI proves:

- customer baseline guard PASS;
- full quality suite PASS;
- Wave 73 targeted acceptance PASS;
- Wave 54 Table & Gift counterpart PASS;
- Wave 35 historical Table & Gift acceptance PASS;
- Wave 72 Gallery Edit predecessor acceptance PASS;
- TypeScript PASS;
- production Next.js build PASS;
- security audit PASS;
- release manifest PASS.

Fresh Install proof remains SKIPPED if there is no customer-baseline/schema change.

Quality and release artifacts must both exist, both GitHub SHA-256 digests must be recorded, both ZIPs must be downloaded independently and recomputed, and release manifest SHA must equal exact Wave 73 HEAD. The releaseHash must be recorded.

The Git-integrated Vercel preview must be READY, `target:null`, exact Wave 73 SHA/branch/PR. Deployment Protection is not weakened and no public bypass/share URL is created merely for health testing.

## Explicit non-scope

No `main` merge; no production promotion; no production/staging/Fresh Install Supabase mutation; no Water-K tenant mutation or revision reconciliation; no K&H/vPOS/payment authority change; no customer-baseline change without schema evidence; no Visual Builder / Email Builder / Template Library UX / Roadmap scope; no shared runtime/registry/binding/Page Schema widening; no template-local Finder, Composer, layout, pricing, inventory, checkout, payment, B2B or product authority; no Wave 74 implementation.
