# Storefront Wave 70 — Beauty Lab Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 70 is **Beauty Lab (`beauty.beauty-lab` v1) Re-acceptance & Builder Hardening**, stacked directly on the exact accepted Wave 69 Ritual House head.

This choice is repository-derived and explicitly resolves the historical ordering conflict rather than inferring the template from the wave number.

### Why Beauty Lab, not Alpine Lodge

The original implementation/scale-out chronology did place Alpine Lodge directly after Ritual House:

- Ritual House: Wave 13 / PR #136;
- Alpine Lodge: Wave 14 / PR #137;
- PR #137 is based directly on the Wave 13 Ritual House branch/head.

That chronology is not the authoritative order for the later re-acceptance replay. The repository contains two independent later chains that deliberately use a different successor relation:

- historical re-acceptance: Wave 31 / PR #177 Ritual House → Wave 32 / PR #184 Beauty Lab;
- current-baseline hardened replay: Wave 50 / PR #246 Ritual House → Wave 51 / PR #249 Beauty Lab.

PR #184 is stacked directly on `feature/storefront-ritual-house-wave31`; PR #249 is stacked directly on `feature/storefront-ritual-house-wave50`. There is no release/reconciliation checkpoint inserted between Ritual House and Beauty Lab in either pair.

The checkpoint pattern reinforces this interpretation. The historical release checkpoint occurs through Wave 29, followed by Derma Studio Wave 30, Ritual House Wave 31 and Beauty Lab Wave 32. The later release checkpoint occurs through Wave 48, followed by Derma Studio Wave 49, Ritual House Wave 50 and Beauty Lab Wave 51. The current replay has already reproduced Statement Lab → Derma Studio → Ritual House as Waves 67 → 68 → 69. Therefore Wave 69 belongs to the same re-acceptance/current-baseline replay cycle, whose direct Ritual successor is Beauty Lab.

Beauty Lab itself predates Ritual House as Golden #5 / Implementation Wave 5. Its position after Ritual House is therefore a re-acceptance ordering decision, not a claim that it was originally implemented after Ritual House.

## Exact stack boundary

- parent branch: `feature/storefront-ritual-house-wave69`;
- parent exact SHA: `9f2900c0159bca8161c0020c1b88f32870c34806`;
- parent Draft PR: #281;
- Wave 70 branch: `feature/storefront-beauty-lab-wave70`;
- Wave 70 Draft PR base: `feature/storefront-ritual-house-wave69`.

Parallel `main`, Email Builder, Visual Builder, Template Library UX and Roadmap movement stays external. Wave 70 does not rebase or import it.

## Provenance

### Original Golden #5 / Wave 5 / PR #126

- template key: `beauty.beauty-lab`;
- version: `1`;
- initial implementation head: `c6e94d6b62b48283b7dac296ed1004b00b5d8dd0`;
- corrected/green implementation head: `9efe4d1b94b2b9856082a8475578351cdbc6f989`;
- final documentation head: `ef5c5c25b758dc95ee376c9fd9511aaf38b3f2ae`;
- original/final canonical template blob: `10d54d27568f045c4536722b3c3ad3f3ff8c5806`.

The original correction fixed the Guided Finder fixture key contract without relaxing the shared engine validator.

### Historical Wave 32 / PR #184

- exact base: Wave 31 Ritual House `76195ce657fa28e12bc07c1a683919865128f67d`;
- implementation head: `3a7019f596416e586c08616b71c874c764f04ec2`;
- final accepted head: `41110a298a53ee2d60e3df388f554992e0d5af4b`;
- accepted Beauty Lab template blob: `5e183f8582a257844b730f71e7aa03c7952d3840`.

### Current-baseline Wave 51 / PR #249

- exact base: Wave 50 Ritual House `b1a32de10c23fb76fb30c66272ae1d1135f7d7cc`;
- final accepted head: `4a2a81a414e311d283c2e99fa5356046df02643e`;
- accepted Beauty Lab template blob: `5e183f8582a257844b730f71e7aa03c7952d3840`;
- canonical `beauty-lab.ts` unchanged by Wave 51.

### Current Wave 69 parent

The inherited `src/lib/builder/templates/beauty-lab.ts` blob is still:

`5e183f8582a257844b730f71e7aa03c7952d3840`

Therefore:

- Wave 5 original → Wave 32 accepted: historical hardening drift exists;
- Wave 32 accepted → Wave 51 accepted: byte-identical;
- Wave 51 accepted → Wave 69 parent: byte-identical;
- no current canonical template drift is proven.

Per the current drift rule, Wave 70 does **not** modify `beauty-lab.ts` and does not replay the old patch.

## Exact historical Wave 32 hardening

The repository diff proves that Wave 32 changed more than a blob identity:

1. added `BEAUTY_LAB_MARKETING_LAYER_CONTRACT`;
2. replaced the monolithic legacy `editorial.hero` Formula Hero with shared `visual.layered-canvas` + `visual.layer` composition;
3. exposed eight independently editable Hero layers: image, overlay, decoration, badge, title, copy, primary CTA, secondary CTA;
4. bound Hero media/copy/CTA slots through stable `content.formulaHero.*` paths;
5. expanded Routine Feature shared `editorial.split-feature` bindings to eyebrow/title/copy/image/imageAlt/ctaLabel/ctaHref;
6. expanded Ingredient Story through the same shared editable split-feature slot model;
7. corrected `commerce.review-summary` from unsupported legacy `summary`/`href` and fabricated zero rating/count fallbacks to shared `rating`/`count`/`label` with `null` rating/count fallbacks;
8. switched the Beauty Lab template regression onto the shared Guided + Visual component/renderer registry;
9. changed Home engine metadata from E3-only to shared `E2+E3+E7` composition;
10. added CI-executed Wave 32 re-acceptance coverage instead of relying on a non-running historical test extension.

The current inherited blob contains these accepted repairs. Wave 70's executable gate re-proves them against today's shared runtime rather than mechanically replaying the historical patch.

## Beauty Lab canonical character

Protected merchandising journey:

`formula → ingredient → texture → guided choice → product`

Protected presentation:

- warm white / cream background;
- muted lilac;
- sage;
- dusty peach;
- charcoal text;
- soft modern serif or refined sans display;
- clean sans UI;
- formula / ingredient / texture / product imagery;
- airy, precise, modern concept-store rhythm without medical-clinic authority.

Beauty Lab remains structurally distinct from Derma Studio and Ritual House. It is not a clinical concern/routine clone and not a mood/ritual/scent-first clone.

## Exact Home and Builder contract

Home order remains:

`Formula Hero → Formula Finder → Shop by Concern → Ingredient Index Preview → New Formulas → Texture Lab → Routine Feature → Product Grid → Ingredient Story → Reviews → Footer`

Formula Hero remains shared Guided + Visual composition. Builder-editable Hero layers are image, overlay, decoration, badge, title, copy, primary CTA and secondary CTA. Marketing imagery is not authority for baked-in copy, price, rating, stock, clinical evidence, ingredient fact, efficacy claim or CTA.

Hierarchy remains `Template → Page Presets → Section Presets → Components`; node IDs remain stable and page-local unique; bindings remain inside existing shared namespaces; Desktop/Tablet/Mobile remain supported across all 14 Page Schema presets.

## E3 Guided Finder authority

Beauty Lab consumes shared E3 as deterministic, attribute-based, explainable, non-diagnostic merchandising guidance over E2-eligible candidates.

E3 does not diagnose, infer disease, prescribe treatment, promise cure, create an opaque score, create product eligibility authority, invent product/ingredient facts or persist a Beauty Lab health profile. Missing/unknown criterion evidence is not treated as a positive match. Ineligible candidates remain excluded.

## Current E4 semantic boundary

The original Wave 5 provenance contains a historical `E4 Routine Engine later` label. That label is not current engine authority.

The current repository defines **E4 as Multi-Product Composer** (`shoporation.multi-product-composer.v1`). Wave 70 therefore does not call a Beauty Lab routine engine E4, does not introduce a Routine Engine and does not widen E4.

The inherited Routine Feature remains editorial/presentation-only until a separately proven shared routine read-model/authority exists. Historical provenance text cannot redefine today's engine registry.

## E7 / product and ingredient truth

Ingredient, texture, formula, product attributes, usage, key specs and specification groups can come only from shared E7 or another authoritative shared product binding. Beauty Lab does not own an ingredient registry, concentration authority, efficacy truth, clinical evidence store or product-truth persistence.

Missing authoritative data fails closed to empty/null presentation. Marketing copy cannot manufacture sellable facts.

Routine Feature and Ingredient Story remain merchant-authored editorial/educational merchandising. They are not treatment plans, diagnosis-based recommendations, disease management, guaranteed outcomes or efficacy/concentration authority.

## Reviews / PDP / responsive contract

The current shared `commerce.review-summary` registry allows only `rating`, `count`, `label` on Home/Product. Beauty Lab uses those exact slots; missing rating/count remains `null` instead of fabricated `0 / 0` evidence.

Actual Product Page nodes remain:

- `beauty-product-gallery`: 7/12 desktop, 7/12 tablet, 12/12 mobile;
- `beauty-product-buybox`: 5/12 desktop, 5/12 tablet, 12/12 mobile.

These are executable node assertions, not metadata-only claims.

## Guided component Page Schema compatibility

Current shared component definitions are accepted as-is:

- `guided.finder`: Home, Catalog, Search, Content;
- `guided.results`: Home, Catalog, Search, Content;
- `guided.explanation`: Product, Content;
- `guided.attribute-index`: Home, Catalog, Content;
- `guided.attribute-navigation`: Home, Catalog.

Wave 70 does not widen the Page Schema allowlist for historical placement.

## Installation, plan and authority boundary

Beauty Lab remains:

- minimum plan `alap`;
- 14 Page Schema presets;
- Desktop/Tablet/Mobile compatible;
- draft-only install/switch materialization;
- demo namespace `beauty-beauty-lab`;
- demo fixtures non-authoritative;
- provider-neutral shared E13 checkout.

Template installation mutates storefront page drafts only, not products, variants, pricing, inventory, reviews, customers, orders or B2B authority.

## Minimal Wave 70 batch

Because the current canonical template is byte-identical to Wave 51 accepted source and no current drift is proven, Wave 70 is exactly one coherent commit containing only:

1. this reconstruction/evidence document;
2. `src/lib/builder/templates/beauty-lab-wave70-acceptance.ts`;
3. `tests/storefront-beauty-lab-wave70-reacceptance.test.ts`.

No canonical template, shared runtime, component registry, Page Schema, binding namespace, SQL, customer baseline or payment file is changed.

## Read-only starting baseline

At Wave 70 start:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- Wave 69 exact parent: `9f2900c0159bca8161c0020c1b88f32870c34806`;
- PR #281: open Draft, mergeable, base Wave 68, one commit, 3 files, +577/-0;
- Wave 69 exact-head CI run `34620318857`: SUCCESS;
- Wave 69 quality artifact `10272710416`, SHA-256 `88e379a22d587cb2cec471dbc72a4a8bb2219465fbb0be00733156edd4a47d96`;
- Wave 69 release artifact `10272500854`, SHA-256 `cdab9ced0bd39428320214a13f1e64d404b64dbfa8f9604c1a05eced17fee071`;
- Wave 69 preview `dpl_5DE4PMS3V4kEpTGQ5EjoCJiS6hNy`: READY, `target:null`, exact Wave 69 Git metadata;
- production remains `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA` on `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`;
- Supabase `waterk-platform`: ACTIVE_HEALTHY;
- `waterk-staging`: ACTIVE_HEALTHY;
- `Shoperation Fresh Install`: INACTIVE;
- Water-K: `water-k`, `pilot`, `pro`, 1 product, 3 variants, 8 orders, 14 storefront pages and 14 revisions;
- 14/14 is parallel external movement and is not reconciled.

Customer baseline on the exact Wave 69 parent remains manifest blob `60b6705ec860849c563f6832460e3c7996f4e433`, `status=ready`, `sourcePolicy=schema-snapshot-only`, `defaultPlan=alap`, `freshInstallProofRequired=false`, proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

## Closure gate

Wave 70 closes only after exact-head GitHub CI succeeds and proves the full quality suite, Wave 70 targeted acceptance, historical Wave 51 acceptance, historical Wave 32 acceptance, Wave 69 predecessor acceptance, TypeScript, production Next.js build, security audit, customer baseline guard and release manifest. Fresh Install remains SKIPPED when no customer-baseline diff exists.

Both quality and release artifacts must exist, be downloaded, and have their ZIP SHA-256 independently recomputed to match GitHub's digest. The release manifest SHA must equal the Wave 70 final head.

The Git-integration preview must be READY, `target:null`, and carry the exact Wave 70 SHA/branch/PR metadata. Deployment Protection is not weakened to manufacture an application-health PASS.

## Explicit non-scope

No `main` merge; no production deployment/promotion; no production/staging/Fresh Install Supabase mutation; no Water-K status/plan/commerce mutation; no 14/14 storefront reconciliation; no K&H/vPOS/payment authority change; no shared runtime/registry/binding/Page Schema widening; no Beauty Lab-local Builder, layout, Finder, routine, ingredient, product, pricing, inventory, checkout or payment authority; no medical/diagnostic authority; no parallel `main` import/rebase; no Visual Builder, Email Builder, Template Library UX or Roadmap work; no Wave 71 implementation.
