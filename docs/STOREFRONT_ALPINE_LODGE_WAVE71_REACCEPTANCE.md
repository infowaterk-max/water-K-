# Storefront Wave 71 — Alpine Lodge Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 71 is **Alpine Lodge (`outdoor.alpine-lodge` v1) Re-acceptance & Builder Hardening**, stacked directly on the exact accepted Wave 70 Beauty Lab head `e8011747b2ad51bc313e215a938e64f93b998c11`.

This successor is repository-derived rather than inferred from the wave number.

The original scale-out order was:

- Wave 13 / PR #136 — Ritual House;
- Wave 14 / PR #137 — Alpine Lodge.

The later historical re-acceptance order deliberately differs and is the authoritative replay chain:

- Wave 31 / PR #177 — Ritual House;
- Wave 32 / PR #184 — Beauty Lab;
- Wave 33 / PR #189 — Alpine Lodge.

The current-baseline hardened replay repeats the same relation:

- Wave 50 / PR #246 — Ritual House;
- Wave 51 / PR #249 — Beauty Lab;
- Wave 52 / PR #251 — Alpine Lodge.

PR #189 is based directly on `feature/storefront-beauty-lab-wave32` at exact SHA `41110a298a53ee2d60e3df388f554992e0d5af4b`. PR #251 is based directly on `feature/storefront-beauty-lab-wave51` at exact SHA `4a2a81a414e311d283c2e99fa5356046df02643e`. Neither chain contains a release/reconciliation checkpoint between Beauty Lab and Alpine Lodge.

Current Waves 69 → 70 have already replayed Ritual House → Beauty Lab. Therefore the same authoritative replay cycle resolves Wave 71 to Alpine Lodge.

## Exact stack boundary

- parent branch: `feature/storefront-beauty-lab-wave70`;
- exact parent SHA: `e8011747b2ad51bc313e215a938e64f93b998c11`;
- parent Draft PR: #282;
- Wave 71 branch: `feature/storefront-alpine-lodge-wave71`;
- Wave 71 Draft PR base: `feature/storefront-beauty-lab-wave70`;
- no `main` rebase/import;
- no production promotion.

Parallel `main`, Email Builder, Visual Builder, Template Library UX and Roadmap movement remains external to this stacked storefront wave.

## Alpine Lodge provenance

### Original implementation — Wave 14 / PR #137

- template key: `outdoor.alpine-lodge`;
- version: `1`;
- original implementation HEAD: `4abadcdbc8c46a771d4487a09a84a7609efb64f0`;
- original final documentation HEAD: `51b7696497d7d64da300198c822ef9b9b3ca6eb9`;
- original implementation/final canonical template blob: `f440c7a2eb8800e11e210f6ad3e024d5a1d3840f`;
- base: Ritual House Wave 13 / PR #136;
- demo namespace: `outdoor-alpine-lodge`;
- minimum plan: `alap`.

### Historical re-acceptance — Wave 33 / PR #189

- exact base: Wave 32 Beauty Lab `41110a298a53ee2d60e3df388f554992e0d5af4b`;
- implementation HEAD: `cf8974aedf47298e6da4b9a2693f840296398513`;
- final accepted HEAD: `599dbb930e49fb2caa80be4c44edcec4425d78a1`;
- accepted canonical template blob: `68ad957eff67e9c3b0303736a493706f30032601`.

### Current-baseline hardened counterpart — Wave 52 / PR #251

- exact base: Wave 51 Beauty Lab `4a2a81a414e311d283c2e99fa5356046df02643e`;
- final accepted HEAD: `88a5431f39d74675f3eaf5b68006d5ad7f22c2a5`;
- accepted canonical template blob: `68ad957eff67e9c3b0303736a493706f30032601`;
- canonical `alpine-lodge.ts` unchanged by Wave 52.

### Current Wave 70 parent

`src/lib/builder/templates/alpine-lodge.ts` at exact Wave 70 HEAD has blob:

`68ad957eff67e9c3b0303736a493706f30032601`

Therefore:

- original Wave 14 → Wave 33: **historical drift exists**;
- Wave 33 accepted → Wave 52 accepted: byte-identical;
- Wave 52 accepted → Wave 70 parent: byte-identical;
- no current drift is proven;
- Wave 71 must not manufacture canonical template churn.

## Exact historical hardening drift

The Wave 33 PR patch proves the Alpine Lodge canonical source changed in specific, reviewable ways:

1. added `ALPINE_LODGE_MARKETING_LAYER_CONTRACT`;
2. replaced inherited monolithic `story.hero` with shared `visual.layered-canvas` + `visual.layer` composition;
3. exposed eight independently editable Hero layers: image, overlay, decoration, eyebrow, heading, copy, primary CTA, secondary CTA;
4. kept Hero content/media/CTA in stable shared `content.alpineHero.*` bindings;
5. aligned `commerce.review-summary` to the shared `rating` / `count` / `label` contract;
6. removed fabricated `rating:0` / `count:0` fallbacks and replaced them with fail-closed `null` values;
7. moved inherited journal reads from disallowed legacy `story.journal.items` to allowlisted `content.journal.items`;
8. removed inherited Catalog duplicate node identity by renaming the collection-header node to `alpine-catalog-collection-header`;
9. retained node-level Product Page responsive geometry rather than metadata-only claims;
10. added executable Wave 33 re-acceptance evidence.

Wave 52 re-proved that hardened source against the then-current shared runtime without editing `alpine-lodge.ts`. Wave 71 follows the same no-churn rule because the Wave 70 parent still contains the exact Wave 33/Wave 52 accepted blob.

## Canonical visual and merchandising identity

Alpine Lodge remains **warm natural luxury Swiss boutique lodge** rather than generic outdoor commerce.

Protected character:

- dark timber;
- stone;
- wool and tactile natural materials;
- misty mountain / forest blue-grey atmosphere;
- restrained copper / bronze detail;
- generous calm boutique-lodge spacing;
- editorial outdoor/lodge presentation.

Protected exclusions:

- red-dominant design;
- terracotta-dominant design;
- Christmas alpine cliché;
- sterile white luxury;
- rustic theme-park styling;
- fabricated technical performance;
- fabricated waterproof/windproof evidence;
- fabricated provenance;
- fabricated sustainability/certification evidence;
- Alpine-local product/material truth authority.

Shopping journey remains:

`collection → layer/use context → material → product → story`

## Exact Home / Builder sequence

Home order remains:

`Alpine Hero → Shop by Collection → Seasonal Layers → Material Story → Featured Collection → Lodge Essentials → Crafted Details → Reviews → Field Journal → Footer`

The Hero is shared composition, not a template-local renderer. Its eight layers remain independently addressable through shared Builder/runtime components.

Marketing images are presentation only. Authoritative price, inventory, rating/review count, material specification, technical performance, provenance, sustainability facts and CTAs are not baked into image assets.

Builder hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Node IDs must remain page-local unique. Binding paths must stay in existing shared namespaces. Desktop/Tablet/Mobile remain supported. All 14 page presets must validate under the current Page Schema without allowlist widening.

## E7 structured product truth boundary

Material, fit, care, product attributes, key specs, grouped specifications and technical/product facts are valid only from shared E7 or another authoritative shared product binding.

Alpine Lodge does not own:

- a material registry authority;
- technical performance authority;
- provenance authority;
- certification authority;
- sustainability authority;
- product truth persistence.

Missing authoritative evidence remains empty/null. The template must not infer waterproofness, windproofness, origin, certification or sustainability status.

## E10 editorial boundary

Material Story, Crafted Details and Field Journal may provide merchant-authored editorial inspiration, education and merchandising context.

Editorial content is not product truth authority and cannot convert a story into technical specification, performance evidence, provenance evidence or sustainability/certification evidence.

Sellable product truth and editorial storytelling remain separate shared authorities.

## Review contract

The current shared `commerce.review-summary` definition permits exactly:

- configurable: `rating`, `count`, `label`;
- binding slots: `rating`, `count`, `label`;
- page types: Home and Product.

Alpine Lodge uses the same exact keys. `rating` and `count` are bound to shared review evidence and remain `null` when absent; fabricated `0 rating / 0 reviews` evidence is prohibited.

## Actual responsive Product Page

The current canonical Product Page contains node-level responsive geometry:

- `alpine-product-gallery`: 7/12 desktop, 7/12 tablet, 12/12 mobile;
- `alpine-product-buybox`: 5/12 desktop, 5/12 tablet, 12/12 mobile.

Wave 71 asserts these actual nodes rather than relying on metadata text.

Product data remains shared-authority bound through `product.*`, `pricing.*`, `inventory.*`, `variant.*`, `commerce.*` and `recommendations.*` namespaces.

## Page Schema drift gate

The exact package still contains 14 presets:

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

Each preset must pass `validateStorefrontPageDocument` using the current shared Story + Visual registry. No legacy placement is allowed to widen the Page Schema allowlist.

## Shared engine boundary

Required full experience remains:

- E1 — shared Page Schema/runtime;
- E2 — shared Product Discovery/eligibility;
- E7 — shared structured product facts;
- E10 — shared editorial/story presentation;
- E13 — shared provider-neutral checkout.

Wave 71 introduces no Alpine-specific product, recommendation, layout, Builder, pricing, inventory, checkout or payment engine.

## Installation / demo safety

Alpine Lodge remains:

- template key `outdoor.alpine-lodge` v1;
- minimum plan `alap`;
- demo namespace `outdoor-alpine-lodge`;
- draft-only installation;
- Desktop / Tablet / Mobile compatible;
- 14 Page Schema presets.

Template installation may mutate storefront page drafts only. Products, variants, pricing, inventory, reviews, customers, orders and B2B authority remain outside the template installation boundary.

Demo fixtures remain non-authoritative and must not contain fabricated waterproof/windproof, certification, provenance or sustainability claims.

## Minimal Wave 71 batch

Because the Wave 70 inherited canonical source is byte-identical to Wave 52 and Wave 33 accepted source, Wave 71 contains exactly three new files in one coherent commit:

1. this evidence/reconstruction document;
2. `src/lib/builder/templates/alpine-lodge-wave71-acceptance.ts`;
3. `tests/storefront-alpine-lodge-wave71-reacceptance.test.ts`.

No canonical template, shared runtime, component registry, binding namespace, Page Schema, SQL/customer-baseline, payment or tenant file is changed.

## Read-only starting baseline

At Wave 71 start:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- exact Wave 70 parent: `e8011747b2ad51bc313e215a938e64f93b998c11`;
- PR #282: open Draft, mergeable, one commit, 3 files, +595/-0;
- Wave 70 exact-head CI run `34622486715`: SUCCESS;
- Wave 70 quality artifact `10273287085`, SHA-256 `1ff453a94d841bc11b3bef9a63ade822ffb679b3ea890809a9bb758f072032ee`;
- Wave 70 release artifact `10273412152`, SHA-256 `1e7dc9865efef4c3c91b6db8effa31303067231767bd8fc59ae0b75ac9822a77`;
- Wave 70 preview `dpl_EH1pdCvMPpCdCXBGCQkZSsRApLo6`: READY, `target:null`, exact Wave 70 Git metadata;
- production deployment remains `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA` on `main@d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`;
- Supabase `waterk-platform`: ACTIVE_HEALTHY;
- `waterk-staging`: ACTIVE_HEALTHY;
- `Shoperation Fresh Install`: INACTIVE;
- Water-K: slug `water-k`, status `pilot`, plan `pro`, 1 product, 3 variants, 8 orders, 14 storefront pages, 14 revisions;
- Water-K 14/14 is parallel external movement and is not reconciled.

Customer baseline remains manifest blob `60b6705ec860849c563f6832460e3c7996f4e433`, `status=ready`, `sourcePolicy=schema-snapshot-only`, `defaultPlan=alap`, `freshInstallProofRequired=false`, proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

## Closure gate

Wave 71 closes only if exact-head CI succeeds and proves customer baseline guard, full quality suite, Wave 71 targeted acceptance, historical Wave 52 acceptance, historical Wave 33 acceptance, Wave 70 predecessor acceptance, TypeScript, production Next.js build, security audit and release manifest.

Fresh Install proof remains SKIPPED if no customer-baseline change exists.

Quality and release artifacts must both exist. Their GitHub SHA-256 digests must be recorded, each ZIP must be downloaded independently, and recomputed SHA-256 must equal the GitHub digest. Release manifest exact SHA must equal the Wave 71 final HEAD.

The Git-integrated Vercel preview must be READY, `target:null`, and carry the exact Wave 71 Git SHA, branch and PR. If anonymous `/api/health` is redirected to Vercel SSO, it is classified **SSO-blocked / protection-blocked preview health**, not application-health PASS. Deployment Protection is not weakened.

## Explicit non-scope

No `main` merge; no production deployment/promotion; no production/staging/Fresh Install Supabase mutation; no Water-K tenant mutation; no 14/14 reconciliation; no K&H/vPOS/payment authority change; no customer-baseline change without schema evidence; no shared runtime/registry/binding/Page Schema widening; no template-local Builder/layout/product/recommendation/material/pricing/inventory/checkout/payment authority; no parallel `main` import; no Visual Builder, Email Builder, Template Library UX or Roadmap work; no Wave 72 implementation.
