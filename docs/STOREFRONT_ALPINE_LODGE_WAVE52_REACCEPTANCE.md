# Storefront Wave 52 – Alpine Lodge Re-acceptance & Builder Hardening

## Canonical sequence reconstruction

Wave 52 is the repository-proven current replay of historical **Wave 33 / PR #189 – Alpine Lodge Re-acceptance & Builder Hardening**.

The successor is not inferred from numbering alone:

- current Wave 51 replays historical Wave 32 / PR #184 — `beauty.beauty-lab`;
- historical PR #189 is Wave 33 — `outdoor.alpine-lodge`;
- PR #189 is stacked directly on `feature/storefront-beauty-lab-wave32` at exact accepted Wave 32 SHA `41110a298a53ee2d60e3df388f554992e0d5af4b`;
- the canonical Alpine Lodge package already exists and is inherited on the current Storefront stack;
- the historical controlled release checkpoint was after Wave 29 and before Wave 30, so there is no release checkpoint between historical Wave 32 and Wave 33.

Therefore the canonical successor of current Wave 51 is:

- current wave: **52**;
- name: **Alpine Lodge Re-acceptance & Builder Hardening**;
- canonical template key: `outdoor.alpine-lodge`;
- template version: `1`;
- historical counterpart: **Wave 33 / PR #189**;
- mode: current-baseline re-acceptance of an inherited implementation, not a new template.

## Stack boundary

Wave 52 is branched from exact Wave 51 HEAD:

`4a2a81a414e311d283c2e99fa5356046df02643e`

Branch:

`feature/storefront-alpine-lodge-wave52`

Stacked PR base:

`feature/storefront-beauty-lab-wave51`

It is intentionally not rebased onto moving `main`.

At Wave 52 start, unrelated platform/admin work had independently advanced `main` and production to `d9e304116e20894d36bded1a443937321d345fb2`. This is external to the Storefront stack and is not imported into Wave 52.

## Current environment start snapshot

Read-only preflight at wave start:

- production Vercel `water-k-native`: READY on unrelated `main` SHA `d9e304116e20894d36bded1a443937321d345fb2`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d9e304116e20`;
- Wave 51 exact preview `dpl_33U9mKXoTiMmDPnZJggM3XBRhEhd`: READY, target `null`, SHA `4a2a81a414e311d283c2e99fa5356046df02643e`;
- Wave 51 preview `/api/health`: Vercel Deployment Protection HTTP 302 SSO redirect, deliberately not counted as an application 200 smoke;
- production Supabase `waterk-platform` / `ewdederyvnwmghlydbno`: `ACTIVE_HEALTHY`;
- staging `waterk-staging` / `rfuvzgumbardvbvqjxdq`: `ACTIVE_HEALTHY`;
- `Shoperation Fresh Install` / `istjjkdcvsvilrycqecd`: `INACTIVE`;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, products `1`, variants `3`, orders `8`, storefront pages `0`.

No environment or tenant mutation is authorized by this wave.

## Canonical Alpine Lodge contract

Alpine Lodge remains the premium Swiss boutique-lodge inspired Outdoor & Lifestyle direction:

- warm natural luxury;
- dark timber, stone, wool and tactile natural materials;
- misty alpine / forest blue-grey atmosphere;
- restrained copper/bronze details;
- calm generous spacing;
- editorial serif + clean refined sans typography.

Accepted merchandising journey:

`collection → layer or use context → material → product → story`

It remains structurally and visually distinct from Trail & Expedition, which is dark, cinematic and route/adventure-first.

Explicit exclusions remain red/terracotta dominance, Christmas-alpine cliché, sterile-white luxury, rustic theme-park styling, invented technical-performance claims, invented provenance/origin claims and invented sustainability claims.

## Approved Home order

1. Alpine Hero
2. Shop by Collection
3. Seasonal Layers
4. Material Story
5. Featured Collection
6. Lodge Essentials
7. Crafted Details
8. Reviews
9. Field Journal
10. Footer

## Builder / Page Schema acceptance contract

Wave 52 verifies the inherited template against the current stacked contract before permitting any template implementation change:

- `Template → Page Presets → Section Presets → Components` hierarchy;
- all 14 Alap-compatible Page Schema presets;
- Desktop / Tablet / Mobile support;
- stable unique node IDs;
- current shared binding namespaces only;
- merchant-editable design tokens;
- shared Story + Visual composition;
- eight independently editable Alpine Hero layers;
- no marketing copy, CTA, price, proof or product truth baked into imagery;
- draft-only template installation;
- no shared runtime allowlist, component registry or binding namespace widening.

The inherited canonical `src/lib/builder/templates/alpine-lodge.ts` is intentionally unchanged at the start of Wave 52. It may be changed only if the exact-head current-baseline acceptance gate proves a real inherited drift.

## Shared authority contract

Alpine Lodge remains presentation/composition over shared engines:

- E1: Storefront Runtime / Page Schema;
- E2: product discovery / catalog eligibility;
- E7: supplied structured material, fit, care and product facts;
- E10: shared editorial / Story presentation;
- E13: provider-neutral checkout.

The template does not own or infer product eligibility, price, compare-at price, inventory, variants, availability, review truth, material/performance/origin/sustainability truth, order state, checkout outcome or payment state.

PDP remains:

- Desktop: gallery 7/12 + buybox 5/12;
- Tablet: gallery 7/12 + buybox 5/12;
- Mobile: gallery 12/12 + buybox 12/12.

## Non-scope

Wave 52 does not authorize:

- a duplicate Alpine Lodge template;
- template-local layout, hero, product-discovery, structured-product, pricing, inventory, review, checkout or payment engine;
- shared runtime allowlist / component registry / binding namespace widening;
- Visual Builder drag/drop, live canvas or inline editing;
- SQL/customer-baseline migration;
- Supabase production/staging mutation;
- Water-K status/plan mutation;
- K&H/vPOS/payment behavior change;
- production deployment;
- `main` merge;
- Wave 53 implementation.

## Acceptance rule

The first exact-head Wave 52 CI gate is authoritative. If it is green and proves no inherited Alpine Lodge drift, `alpine-lodge.ts` remains untouched and no redundant second build-triggering commit is created. If it fails, only artifact-proven inherited drift may be repaired, without loosening shared contracts.
