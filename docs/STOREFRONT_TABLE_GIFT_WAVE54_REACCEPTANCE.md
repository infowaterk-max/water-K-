# Storefront Wave 54 – Table & Gift Re-acceptance & Builder Hardening

## Canonical sequence reconstruction

Wave 54 is the repository-proven current replay of historical **Wave 35 / PR #195 – Table & Gift Re-acceptance & Builder Hardening**.

The sequence is reconstructed from repository history, accepted stacked PRs and the already-registered template package rather than inferred from numbering:

- original **Wave 15 / PR #138** introduced Gallery Edit;
- original **Wave 16 / PR #139** introduced canonical `food.table-gift` v1 directly on top of Gallery Edit;
- original **Wave 17 / PR #140** introduced Creator Station directly on top of Table & Gift;
- historical re-acceptance **Wave 34 / PR #194** re-accepted Gallery Edit;
- historical re-acceptance **Wave 35 / PR #195** is stacked directly on `feature/storefront-gallery-edit-wave34` at accepted Wave 34 HEAD `ad2709286200692d3f39c51e77c019c0fec0c948`;
- historical **Wave 36 / PR #198** follows Table & Gift with Creator Station and explicitly records the reconstructed 14→33, 15→34, 16→35, 17→36 sequence;
- the current shared template catalog already registers `TABLE_GIFT_TEMPLATE_PACKAGE`;
- the accepted historical Wave 35 `table-gift.ts` blob and the inherited file on current Wave 53 are byte-identical: `0147f740a22db23485adf3649bbe5fa0768ca6c9`;
- there is no release checkpoint or infrastructure-only Storefront step between historical Wave 34 and Wave 35, nor between original Wave 15 and Wave 16.

Therefore the canonical successor of current Wave 53 is:

- current wave: **54**;
- name: **Table & Gift Re-acceptance & Builder Hardening**;
- canonical template key: `food.table-gift`;
- template version: `1`;
- historical re-acceptance counterpart: **Wave 35 / PR #195**;
- original template counterpart: **Wave 16 / PR #139**;
- mode: current-baseline re-acceptance of an inherited implementation, not a new template.

## Exact stack boundary

Wave 54 is based on exact Wave 53 HEAD:

`9d0b065e2758dd9e746b496bfa57b1e1733b007d`

Branch:

`feature/storefront-table-gift-wave54`

Stacked Draft PR base:

`feature/storefront-gallery-edit-wave53`

The Storefront stack is intentionally not rebased onto moving `main`.

## Read-only preflight snapshot

At Wave 54 start:

- GitHub `main`: `5e8e03c189cf4b5d8c2bce563da073a502e3d7ac`, independently advanced by Roadmap Block 22 / Visual Builder merge after Wave 53 closure;
- Wave 53 branch: exact `9d0b065e2758dd9e746b496bfa57b1e1733b007d`;
- PR #254: open, Draft, unmerged and mergeable, still stacked on Wave 52;
- Wave 53 CI run `34585431207` / #2761: SUCCESS on exact `9d0b065e2758dd9e746b496bfa57b1e1733b007d`;
- Vercel production deployment `dpl_A5SFXPx5RD19siomeJSGpVDMxezY`: READY, target `production`, exact unrelated `main` SHA `5e8e03c189cf4b5d8c2bce563da073a502e3d7ac`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `5e8e03c189cf`;
- Wave 53 preview `dpl_75bKFq38UKQrsmiUKipa5ndYMq4L`: READY, target `null`, exact SHA `9d0b065e2758dd9e746b496bfa57b1e1733b007d`;
- Wave 53 preview `/api/health` re-check: HTTP 302 to Vercel SSO due Deployment Protection, therefore not an application 200 smoke PASS;
- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- `Shoperation Fresh Install` / `istjjkdcvsvilrycqecd`: `INACTIVE`;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, products `1`, variants `3`, orders `8`, storefront pages `0`, storefront page revisions `0`.

The customer baseline manifest inherited by the Storefront stack is unchanged:

- blob `60b6705ec860849c563f6832460e3c7996f4e433`;
- status `ready`;
- `legacyMigrationReplay=false`;
- default plan `alap`;
- ordered baseline through `0017`;
- `freshInstallProofRequired=false`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

No environment, database, tenant or production mutation is authorized by this wave.

## Canonical Table & Gift contract

Table & Gift remains premium gifting / occasion commerce × curated selection × configurable gifting, not a generic grocery or marketplace skin.

Accepted visual DNA remains:

- ivory background;
- deep burgundy primary;
- forest green secondary;
- champagne accent;
- black text;
- elegant editorial serif plus clean sans-serif interface typography;
- gift boxes, ribbon, premium table settings and food/drink packaging as editorial still-life imagery;
- generous, refined, celebratory spacing.

It remains materially distinct from adjacent/sibling directions:

- Gallery Edit: airy room/object/material gallery curation;
- Market Pantry: pantry/market/composer-first grocery commerce;
- Table & Gift: occasion-, recipient- and gifting-first guided/composed premium commerce.

Explicit exclusions remain Market Pantry duplication, rustic/farmhouse styling, promo chaos, fake fixed-price gift boxes, virtual bundle SKUs, fake scarcity and marketing copy baked into imagery.

## Approved Home order

1. Gift Builder
2. Shop by Occasion
3. Curated Gift Sets
4. Build Your Gift
5. Gift Message
6. Corporate Gift CTA
7. Footer

The rejected extra Home sections remain forbidden:

- Gift Hero
- Gift Story
- Reviews

## Builder / Page Schema acceptance contract

Before any inherited implementation change, Wave 54 verifies:

- canonical `food.table-gift` v1 identity;
- historical and original predecessor/successor relationship;
- category-level visual and structural distinctness;
- exact seven-step Home order;
- all 14 Alap-compatible Page Schema presets;
- Desktop / Tablet / Mobile support;
- stable unique node IDs;
- only current shared binding namespaces;
- merchant-editable design tokens;
- complete shared Guided Finder and Multi-Product Composer binding surfaces;
- complete merchant-editable Gift Message and Corporate Gift presentation slots;
- no marketing copy, CTA, price, scarcity proof or authority baked into imagery;
- draft-only template installation;
- no shared runtime allowlist, component registry or binding namespace widening.

Hierarchy remains:

`Template → Page Presets → Section Presets → Components`

The inherited canonical `src/lib/builder/templates/table-gift.ts` is intentionally unchanged at Wave 54 start. Historical Wave 35 had already corrected forbidden inherited `checkout.*` presentation bindings to current shared `content.checkoutGiftMessage.*` bindings without widening the runtime allowlist. The current Wave 53-stack file is byte-identical to that accepted historical implementation, so no current implementation drift is pre-proven. Only the exact-head Wave 54 gate may justify a template change.

## Shared authority contract

Table & Gift remains presentation/composition over shared engines:

- E1: Storefront Runtime / Page Schema;
- E2: product discovery and catalog/channel eligibility;
- E3: Guided Finder guidance/ranking only;
- E4: Multi-Product Composer intent over real catalog products;
- E13: provider-neutral checkout and final commerce revalidation.

**E10 is not part of the accepted Table & Gift contract.**

The template may not own or infer product eligibility, SKU identity, price, compare-at price, inventory, variants, reviews, bundle price, stock, customer, order, B2B approval, gift-message persistence, checkout outcome or payment state.

Gift Builder may guide among already-eligible products. Build Your Gift may compose real catalog products but may not create a virtual bundle SKU or authoritative fixed gift-box price. Product, price, stock, channel and checkout eligibility remain shared/server-authoritative and must be revalidated before commerce mutations.

PDP remains:

- Desktop: gallery 7/12 + buybox 5/12;
- Tablet: gallery 7/12 + buybox 5/12;
- Mobile: gallery 12/12 + buybox 12/12.

## Installation and entitlement boundary

Table & Gift remains Alap-compatible and exposes the canonical 14-page package. Template installation is draft-only. A template switch or installation may materialize storefront page drafts but may not mutate products, variants, pricing, inventory, customers, orders or B2B authority.

Checkout remains provider-neutral shared E13. No K&H/vPOS provider behavior, merchant secret, callback/process/status logic or payment-state authority belongs to Table & Gift.

## First-batch rule

Wave 54 starts with one complete batch containing only:

1. this canonical reconstruction / scope document;
2. `table-gift-wave54-acceptance.ts` current-baseline contract;
3. `storefront-table-gift-wave54-reacceptance.test.ts` executable gate.

No speculative `table-gift.ts` hardening is included. The first exact-head CI result is authoritative:

- if green and no inherited drift is proven, `table-gift.ts` remains untouched and no second build-triggering commit is created;
- if red, only artifact-proven inherited drift may be repaired, without weakening shared contracts or widening registries/allowlists/binding namespaces.

## Non-scope

Wave 54 does not authorize:

- duplicate Table & Gift template/key/namespace;
- new gifting, guidance, composer, layout, commerce, checkout or payment engine;
- virtual bundle SKU or fixed gift-box pricing authority;
- gift-message persistence or corporate/B2B pricing/approval authority;
- shared runtime allowlist / component registry / binding namespace widening;
- further Visual Builder roadmap expansion;
- SQL/customer-baseline migration;
- Supabase production/staging mutation;
- Water-K status/plan mutation;
- K&H/vPOS/payment behavior change;
- production deployment;
- merge to `main`;
- Wave 55 implementation.

## Closure rule

Wave 54 closes only on its exact final HEAD when:

- CI is SUCCESS;
- Quality, TypeScript, production Next.js build, Security and customer-baseline guard pass;
- Wave 54 current-baseline gate passes and inherited Wave 35 gate remains green;
- Release Manifest passes and its artifact/release hash are recorded;
- Fresh Install runs only if a baseline migration diff exists, otherwise it is correctly skipped;
- exact-SHA Vercel Preview is READY and remains non-production;
- any 302/401/403 caused by Deployment Protection is not mislabeled as an application 200 smoke;
- the PR remains Draft, open and unmerged, stacked on Wave 53;
- exact stacked diff is recorded;
- production/main/Supabase boundaries are re-verified without mutation;
- Wave 55 remains unstarted.
