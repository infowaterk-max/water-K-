# Storefront Wave 72 — Gallery Edit Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 72 is **Gallery Edit (`home.gallery-edit` v1) Re-acceptance & Builder Hardening**, stacked directly on the exact accepted Wave 71 Alpine Lodge head `417819a8588c23d91df008b435d0c9680f6e30b0`.

This successor is repository-derived rather than inferred from the wave number.

The direct original scale-out relation is:

- Wave 14 / PR #137 — Alpine Lodge;
- Wave 15 / PR #138 — Gallery Edit.

PR #138 targets `feature/storefront-alpine-lodge-wave14` at exact base SHA `51b7696497d7d64da300198c822ef9b9b3ca6eb9`.

The historical re-acceptance relation is:

- Wave 33 / PR #189 — Alpine Lodge;
- Wave 34 / PR #194 — Gallery Edit.

PR #194 targets `feature/storefront-alpine-lodge-wave33` at exact base SHA `599dbb930e49fb2caa80be4c44edcec4425d78a1`.

The current-baseline hardened replay relation is:

- Wave 52 / PR #251 — Alpine Lodge;
- Wave 53 / PR #254 — Gallery Edit.

PR #254 targets `feature/storefront-alpine-lodge-wave52` at exact base SHA `88a5431f39d74675f3eaf5b68006d5ad7f22c2a5`.

Repository evidence explicitly records no release/reconciliation checkpoint between Alpine Lodge and Gallery Edit in these direct replay relations.

The current replay has already reproduced the same authoritative historical/current-baseline cycle:

- Wave 69 / PR #281 — Ritual House;
- Wave 70 / PR #282 — Beauty Lab;
- Wave 71 / PR #283 — Alpine Lodge.

Therefore the repository-proven direct successor is Gallery Edit, and Wave 72 is not a newly invented slot.

## Exact stack boundary

- parent branch: `feature/storefront-alpine-lodge-wave71`;
- exact parent SHA: `417819a8588c23d91df008b435d0c9680f6e30b0`;
- parent Draft PR: #283;
- Wave 72 branch: `feature/storefront-gallery-edit-wave72`;
- Wave 72 Draft PR base: `feature/storefront-alpine-lodge-wave71`;
- no `main` rebase/import;
- no production promotion.

Parallel `main`, Email Builder, Visual Builder, Template Library UX and Roadmap movement remains external to this stacked storefront wave.

## Gallery Edit provenance

### Original implementation — Wave 15 / PR #138

- template key: `home.gallery-edit`;
- version: `1`;
- original implementation HEAD: `a25f0b4082768622121631ef29463cfb4d00e9c3`;
- original final documentation HEAD: `96f74bac17443f0c733f089da8decad3d13ecd11`;
- original canonical template blob: `8f52686e45b7b00e29d192f2c6065f5120d26729`;
- base: Alpine Lodge Wave 14 / PR #137 at `51b7696497d7d64da300198c822ef9b9b3ca6eb9`;
- demo namespace: `home-gallery-edit`;
- minimum plan: `alap`.

### Historical re-acceptance — Wave 34 / PR #194

- exact base: Alpine Lodge Wave 33 `599dbb930e49fb2caa80be4c44edcec4425d78a1`;
- implementation HEAD: `cffcbc83bc9ff40168121327eba4a0d2a61f437a`;
- final accepted HEAD: `ad2709286200692d3f39c51e77c019c0fec0c948`;
- accepted canonical template blob: `fe8c36d966340a7011fd88f8ea24950f1e2dac44`.

### Current-baseline hardened counterpart — Wave 53 / PR #254

- exact base: Alpine Lodge Wave 52 `88a5431f39d74675f3eaf5b68006d5ad7f22c2a5`;
- final accepted HEAD: `9d0b065e2758dd9e746b496bfa57b1e1733b007d`;
- accepted canonical template blob: `fe8c36d966340a7011fd88f8ea24950f1e2dac44`;
- canonical `gallery-edit.ts` unchanged by Wave 53.

### Current Wave 71 parent

`src/lib/builder/templates/gallery-edit.ts` at exact Wave 71 HEAD has blob:

`fe8c36d966340a7011fd88f8ea24950f1e2dac44`

Therefore:

- original Wave 15 → historical Wave 34: **historical drift exists**;
- Wave 34 accepted → Wave 53 accepted: byte-identical;
- Wave 53 accepted → Wave 71 parent: byte-identical;
- no current drift is proven;
- Wave 72 must not manufacture canonical template churn.

## Exact historical hardening drift

The Wave 34 PR patch proves the canonical Gallery Edit source changed in specific, reviewable ways:

1. added `GALLERY_EDIT_MARKETING_LAYER_CONTRACT`;
2. replaced the inherited monolithic `story.hero` with shared `visual.layered-canvas` + `visual.layer` composition;
3. exposed six independently editable Hero layers: image, overlay, eyebrow, heading, copy and primary CTA;
4. moved Hero content/media/CTA to stable shared `content.galleryHero.*` bindings;
5. expanded shared `story.feature` bindings so eyebrow, title, copy, image, imageAlt, ctaLabel and ctaHref remain Builder-editable;
6. aligned `commerce.review-summary` to the current shared `rating` / `count` / `label` contract;
7. removed fabricated `rating:0` / `count:0` evidence and replaced it with fail-closed `null` fallbacks;
8. moved Journal reads from legacy `story.journal.items` to allowlisted `content.journal.items`;
9. removed the inherited Catalog duplicate node identity by using `gallery-catalog-collection-header`;
10. added stable `content.<pageType>.title` / `content.<pageType>.copy` bindings to simple content pages;
11. retained actual Product Page node geometry: gallery 7/7/12 and buybox wrapper 5/5/12;
12. added executable historical acceptance evidence.

Wave 53 re-proved that hardened source against its current shared runtime without editing `gallery-edit.ts`. Wave 72 follows the same no-churn rule because the Wave 71 exact parent still contains the exact Wave 34/Wave 53 accepted blob.

## Canonical visual and merchandising identity

Gallery Edit remains a **contemporary interior/design concept store × gallery**, not a generic furniture marketplace and not an Alpine Lodge reskin.

Protected character:

- chalk/off-white background;
- limestone-grey surfaces;
- graphite typography;
- one restrained curatorial accent;
- editorial grotesk or refined-serif display direction;
- clean sans-serif interface typography;
- furniture, lighting, ceramics, textiles and objects presented as gallery pieces;
- large negative space;
- airy, precise gallery-scale spacing.

Shopping journey remains:

`edit → room or object type → material → object → story`

Protected exclusions include busy marketplace composition, rustic farmhouse treatment, overloaded gold luxury, streetwear language, fabricated designer provenance, fabricated material claims and baked marketing copy.

## Exact Home / Builder sequence

Home order remains:

`Gallery Hero → Curated Rooms → New Objects → Designer Story → Material Edit → Gallery Grid → Featured Edit → Reviews → Journal → Footer`

The Hero remains shared composition, not a template-local renderer. Its six layers remain independently addressable through shared Builder/runtime components.

Marketing images are presentation only. Authoritative price, inventory, rating/review count, product/material/dimension facts, designer provenance, availability and CTA content must not be baked into image assets.

Builder hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Node IDs remain page-local unique. Binding paths remain in existing shared namespaces. Desktop/Tablet/Mobile remain supported. All 14 page presets must validate under the current Page Schema without allowlist widening.

## Current review contract

The shared `commerce.review-summary` definition permits exactly:

- configurable: `rating`, `count`, `label`;
- binding slots: `rating`, `count`, `label`;
- page types: Home and Product.

Gallery Edit uses the same keys. Rating/count remain authoritative shared review evidence and stay `null` when absent. Fabricated zero-rating/zero-review evidence is prohibited.

## E7 structured product truth boundary

Material, dimensions, finish, care, supplied product attributes, key specs and grouped specifications are valid only from shared E7 or another authoritative shared product binding.

Gallery Edit does not own designer provenance, material truth, dimensions, product truth persistence, pricing, inventory or recommendation authority.

Missing authoritative evidence remains empty/null. The template does not infer designer identity, origin, material composition, dimensions, stock or certification.

## E10 editorial boundary

Designer Story, Object / Studio Note, Journal and gallery-story surfaces may provide merchant-authored editorial context.

Editorial content is not product truth authority and cannot convert a story into designer provenance, material evidence, dimension evidence, availability or certification evidence.

Sellable product truth and editorial storytelling remain separate shared authorities.

## Actual responsive Product Page

The current canonical Product Page contains node-level responsive geometry:

- `gallery-product-gallery`: 7/12 desktop, 7/12 tablet, 12/12 mobile;
- `gallery-product-buybox`: 5/12 desktop, 5/12 tablet, 12/12 mobile.

Wave 72 asserts these actual nodes rather than relying on metadata-only claims.

Product data remains shared-authority bound through `product.*`, `pricing.*`, `inventory.*`, `variant.*`, `commerce.*` and `recommendations.*` namespaces.

## Page Schema drift gate

The package contains exactly 14 presets:

1. Home;
2. Catalog;
3. Product;
4. Search;
5. Cart;
6. Checkout;
7. Account;
8. Content;
9. Blog Index;
10. Blog Article;
11. FAQ;
12. Contact;
13. Legal;
14. Not Found.

Wave 72 explicitly checks Home, Catalog, Search, Product, Content, Blog Index, Blog Article and Checkout in addition to validating all 14 presets with `validateStorefrontPageDocument` using the current shared Story + Visual registry.

No legacy placement may widen the Page Schema allowlist, component registry or binding namespace.

## Shared engine boundary

Required full experience remains:

- E1 — shared Page Schema/runtime;
- E2 — shared Product Discovery/eligibility;
- E7 — shared structured product facts;
- E10 — shared editorial/story presentation;
- E13 — shared provider-neutral checkout.

Wave 72 introduces no Gallery-specific product, recommendation, layout, Builder, designer-provenance, material-truth, pricing, inventory, checkout or payment engine.

## Installation / demo safety

Gallery Edit remains:

- template key `home.gallery-edit` v1;
- minimum plan `alap`;
- demo namespace `home-gallery-edit`;
- draft-only installation;
- Desktop / Tablet / Mobile compatible;
- 14 Page Schema presets.

Template installation may mutate storefront page drafts only. Products, variants, pricing, inventory, reviews, customers, orders and B2B authority remain outside the template installation boundary.

Demo fixtures remain non-authoritative and must not contain fabricated designer provenance, material, origin, certification, dimensions, scarcity or stock claims.

## Minimal Wave 72 batch

Because the Wave 71 inherited canonical source is byte-identical to Wave 53 and Wave 34 accepted source, Wave 72 contains exactly three new files in one coherent commit:

1. this evidence/reconstruction document;
2. `src/lib/builder/templates/gallery-edit-wave72-acceptance.ts`;
3. `tests/storefront-gallery-edit-wave72-reacceptance.test.ts`.

No canonical template, shared runtime, component registry, binding namespace, Page Schema, SQL/customer-baseline, payment or tenant file is changed.

## Read-only starting baseline

At Wave 72 start:

- GitHub `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- exact Wave 71 parent: `417819a8588c23d91df008b435d0c9680f6e30b0`;
- PR #283: open Draft, base `feature/storefront-beauty-lab-wave70@e8011747b2ad51bc313e215a938e64f93b998c11`, head `417819a8588c23d91df008b435d0c9680f6e30b0`, mergeable/clean;
- Wave 71 exact-head CI run `34624528654`: SUCCESS;
- Wave 71 quality artifact `10274325942`, SHA-256 `4f91e2c2ab0e1142aa66c627091cb75a9cacb69107614c874fb5dbb14ecaf296`;
- Wave 71 release artifact `10274491074`, SHA-256 `5c7e4e8ce5693f2140964ae72881812c99cedee2caca37211318d01f19d83639`;
- Wave 71 preview `dpl_H7vsRRVPAKygfjfbDqCVKipekBeg`: READY, `target:null`, exact Wave 71 Git metadata;
- production deployment: `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA`, READY, `target=production`, Git SHA `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`;
- Supabase `waterk-platform`: ACTIVE_HEALTHY;
- `waterk-staging`: ACTIVE_HEALTHY;
- `Shoperation Fresh Install`: INACTIVE;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, 1 product, 3 variants, 8 orders, 14 storefront pages, **43 storefront page revisions** at the actual Wave 72 preflight snapshot;
- the revision increase from the Wave 71 closure value 14 to 43 is parallel external movement and is not reconciled by Wave 72.

Customer baseline remains manifest blob `60b6705ec860849c563f6832460e3c7996f4e433`, `status=ready`, `sourcePolicy=schema-snapshot-only`, `defaultPlan=alap`, `freshInstallProofRequired=false`, proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

## Closure gate

Wave 72 closes only if exact-head CI succeeds and proves customer baseline guard, full quality suite, Wave 72 targeted acceptance, current-baseline Wave 53 Gallery Edit acceptance, historical Wave 34 Gallery Edit acceptance, Wave 71 Alpine Lodge predecessor acceptance, TypeScript, production Next.js build, security audit and release manifest.

Fresh Install proof remains SKIPPED if no customer-baseline change exists.

Quality and release artifacts must both exist. Their GitHub SHA-256 digests must be recorded, each ZIP must be downloaded independently, and recomputed SHA-256 must equal the GitHub digest. Release manifest exact SHA must equal the Wave 72 final HEAD and `releaseHash` must be recorded.

The Git-integrated Vercel preview must be READY, `target:null`, and carry the exact Wave 72 Git SHA, branch and PR. If anonymous `/api/health` is redirected to Vercel SSO, it is classified **SSO-blocked / protection-blocked preview health**, not application-health PASS. Deployment Protection must not be weakened and no public bypass/share URL may be created merely for health testing.

## Explicit non-scope

No `main` merge; no production deployment/promotion; no production/staging/Fresh Install Supabase mutation; no Water-K tenant mutation; no 14/14 or 14/43 reconciliation; no K&H/vPOS/payment authority change; no customer-baseline change without schema evidence; no shared runtime/registry/binding/Page Schema widening; no template-local Builder/layout/product/recommendation/designer/material/pricing/inventory/checkout/payment authority; no parallel `main` import; no Visual Builder, Email Builder, Template Library UX or Roadmap work; no Wave 73 implementation.
