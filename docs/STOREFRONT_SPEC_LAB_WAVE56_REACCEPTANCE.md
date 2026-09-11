# Storefront Wave 56 — Spec Lab Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 56 is not a newly invented template or reordered roadmap item. Repository and pull-request history prove the direct chain:

- original Wave 16 / PR #139 — Table & Gift;
- original Wave 17 / PR #140 — Creator Station, stacked directly on Table & Gift;
- original Wave 18 / PR #141 — Spec Lab, stacked directly on Creator Station;
- original Wave 19 / PR #142 — Playroom, stacked directly on Spec Lab.

The historical re-acceptance chain independently proves the same transition:

- Wave 35 / PR #195 — Table & Gift;
- Wave 36 / PR #198 — Creator Station;
- Wave 37 / PR #208 — Spec Lab, base `feature/storefront-creator-station-wave36`;
- Wave 38 / PR #210 — Playroom, base `feature/storefront-spec-lab-wave37`.

Therefore the repository-proven canonical transition after current Wave 55 Creator Station is **Wave 56 — Spec Lab Re-acceptance & Builder Hardening**. There is no intervening Storefront release checkpoint or infrastructure wave between Creator Station and Spec Lab in either chain.

## Exact stack boundary

- current predecessor: Wave 55 — Creator Station Re-acceptance & Builder Hardening;
- predecessor branch: `feature/storefront-creator-station-wave55`;
- exact predecessor SHA: `b4777db050419322fd5e8f948c929192518d1cec`;
- Wave 56 branch: `feature/storefront-spec-lab-wave56`;
- required PR base: `feature/storefront-creator-station-wave55`;
- merge target remains the stacked predecessor, never `main`;
- no production deployment is authorized.

## Canonical template identity

- template: **Spec Lab**;
- canonical key: `tech.spec-lab`;
- version: `1`;
- legacy working alias: `Tech Command`;
- category: Electronics & Technology;
- historical counterpart: Wave 37 / PR #208;
- original counterpart: Wave 18 / PR #141;
- demo namespace: `tech-spec-lab`;
- minimum plan: `alap`;
- Page Schema presets: 14.

The accepted specialist direction remains a dark-navy technical decision lab, not Creator Station's creator-workflow/signal-chain experience and not generic gamer RGB. The canonical decision path is:

`Mit keresel? → Mire használod? → Hasonlítsd össze → Tech Finder → Építsd fel a szetted`

The accepted Home order remains:

`Mit keresel? → Mire használod? → Hasonlítsd össze → Tech Finder → Építsd fel a szetted → Compatibility Matrix → System Requirements → Accessory Matcher → Trade-in → Tech Magazine → Footer`

## Byte-identity / drift hypothesis

Before Wave 56 implementation, the inherited canonical `src/lib/builder/templates/spec-lab.ts` was compared between:

- historical Wave 37 final HEAD `a18e4b50583cc22bd7a9dde581afa7a7d0726870`;
- current Wave 55 final HEAD `b4777db050419322fd5e8f948c929192518d1cec`.

Both refs resolve the file to blob SHA:

`172a065cba30db10dac993695be1ba1831bf986d`

This is strong pre-gate evidence that the canonical implementation has not drifted since the accepted Wave 37 hardening. Wave 56 therefore does **not** change `spec-lab.ts` speculatively. Only an executable current-baseline acceptance failure that proves genuine implementation drift may justify a later template change.

## Current-baseline acceptance contract

Wave 56 must prove all of the following on the current stacked baseline:

- canonical `tech.spec-lab` version `1` identity;
- direct Creator Station → Spec Lab predecessor/successor relationship;
- original Wave 18 and historical Wave 37 continuity;
- visual and structural separation from Creator Station;
- exact five-step decision path and exact eleven-step Home composition;
- all 14 Page Schema presets;
- Desktop / Tablet / Mobile compatibility;
- stable, unique node IDs;
- only current shared binding namespaces;
- preservation of the historical `system.* → product.*` and `story.* → content.*` corrections;
- `Template → Page Presets → Section Presets → Components` hierarchy;
- merchant-editable design tokens;
- marketing copy, CTA, price and evidence remain structured/editable rather than baked into imagery;
- `alap` entitlement contract;
- draft-only installation boundary;
- product, pricing, inventory, variants, reviews, recommendations and checkout remain shared-engine authority;
- E3 remains guidance/ranking only;
- E5 remains setup/configurator read-model authority;
- E6 remains explainable and fail-closed (`Unknown != Compatible`);
- E7 remains structured specification/comparison authority;
- E10 remains editorial presentation authority;
- E13 remains provider-neutral checkout and final validation;
- Trade-in remains an integration hook without valuation or lifecycle authority;
- Product 3D remains an external viewer hook without a template-owned 3D engine;
- template switching may mutate Storefront drafts only and may not mutate products, variants, prices, inventory, customers, orders or B2B authority;
- no shared runtime allowlist, component registry or binding namespace widening is permitted merely to make acceptance pass.

## First-batch implementation

The Wave 56 first batch intentionally contains only:

1. this canonical reconstruction document;
2. `src/lib/builder/templates/spec-lab-wave56-acceptance.ts`;
3. `tests/storefront-spec-lab-wave56-reacceptance.test.ts`.

No canonical template implementation, SQL/customer-baseline migration, shared runtime registry, shared component registry, binding allowlist, payment behavior or tenant data is changed by this batch.

The executable Wave 56 gate is intentionally current-baseline focused while the inherited Wave 37 gate remains in the full suite. If this first exact-head CI is green, the byte-identical canonical implementation is accepted without a second hardening commit or second build. If it fails, the failure must first be classified from CI artifact evidence and repository history; a test-assumption defect must not be "fixed" by mutating the canonical template.

## Shared authority boundary

Full Spec Lab experience continues to use shared engines:

- E1 — shared Storefront/Page Schema runtime;
- E2 — catalog/search/channel eligibility;
- E3 — guided discovery only;
- E5 — configurator/setup intent and read models;
- E6 — explainable compatibility;
- E7 — structured product truth, comparison and system requirements;
- E10 — editorial/Tech Magazine presentation;
- E13 — provider-neutral cart/checkout/final validation.

The template owns presentation and draft composition only. It does not own product eligibility, price, stock, variants, reviews, recommendation truth, compatibility truth, checkout/payment state, Trade-in valuation or 3D geometry.

## Explicit non-scope

Wave 56 does not authorize:

- a second Spec Lab template;
- a template-local finder/configurator/compatibility/specification/layout/commerce/checkout engine;
- shared registry or allowlist widening;
- fabricated specification, compatibility, performance, scarcity or Trade-in value;
- Trade-in persistence or valuation authority;
- a template-owned 3D engine;
- Visual Builder roadmap expansion;
- SQL/customer-baseline migration;
- Supabase production or staging mutation;
- Fresh Install activation without a proven migration-proof requirement;
- Water-K status or plan mutation;
- K&H/vPOS/payment behavior change;
- `main` merge;
- production deployment;
- Wave 57 implementation.

## Baseline observed before the first batch

Read-only checks before Wave 56 confirmed:

- GitHub `main`: `5e8e03c189cf4b5d8c2bce563da073a502e3d7ac`;
- Wave 55 exact HEAD: `b4777db050419322fd5e8f948c929192518d1cec`;
- PR #257: Draft, open, unmerged, mergeable;
- production Vercel remains on `5e8e03c189cf4b5d8c2bce563da073a502e3d7ac`;
- public production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `5e8e03c189cf`;
- Wave 55 preview: READY / `target:null`; its protected `/api/health` returns Vercel SSO HTTP 302 and is not treated as application smoke PASS;
- `waterk-platform`: `ACTIVE_HEALTHY`;
- `waterk-staging`: `ACTIVE_HEALTHY`;
- Shoperation Fresh Install: `INACTIVE`;
- Water-K: `pilot / pro`, 1 product, 3 variants, 8 orders, 0 Storefront pages, 0 Storefront page revisions;
- customer baseline: `ready`, ordered `0001–0017`, `freshInstallProofRequired=false`, proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 56 closure evidence belongs to the exact-head CI/PR/Vercel evidence after this single first batch runs; it must not be invented in advance.
