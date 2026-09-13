# Storefront Wave 69 — Ritual House Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 69 is the repository-proven direct successor to Wave 68 Derma Studio: **Ritual House (`beauty.ritual-house` v1) Re-acceptance & Builder Hardening**.

This scope is reconstructed from repository evidence, not inferred from the wave number:

1. Original scale-out history: Derma Studio Wave 12 / PR #135 is followed directly by Ritual House Wave 13 / PR #136. PR #136 is stacked on `feature/storefront-derma-studio-wave12` at exact Derma final SHA `52bb44be85c47ed364de69ee8a9e958df52cb830`.
2. Historical re-acceptance repeats the same order: Derma Studio Wave 30 / PR #175 is followed directly by Ritual House Wave 31 / PR #177. PR #177 is stacked on `feature/storefront-derma-studio-wave30` at exact SHA `29751e3671ad9082dd3be914ab02070ff4e2bf11`.
3. Current-baseline hardening repeats it again: Derma Studio Wave 49 / PR #243 is followed directly by Ritual House Wave 50 / PR #246. PR #246 is stacked on `feature/storefront-derma-studio-wave49` at exact SHA `e0ca1465069b06bcab011f5bb358d3f9733c3684`.
4. Wave 50 itself records the canonical Derma → Ritual successor and closed with only evidence, acceptance contract and executable acceptance because the inherited Ritual House canonical source required no current-baseline repair.
5. The repository template catalog on the parallel current `main` still exposes the single canonical `RITUAL_HOUSE_TEMPLATE_PACKAGE`; this is sequence evidence only and is not imported or rebased into the storefront stack.
6. No repository evidence identifies an intervening template or reconciliation/release checkpoint between Derma Studio and Ritual House in the repeated sequence.

Therefore the canonical Wave 69 scope is **Ritual House Re-acceptance & Builder Hardening**.

## Exact stack boundary

Wave 69 starts directly from the fully accepted Wave 68 exact final head:

- parent branch: `feature/storefront-derma-studio-wave68`;
- parent exact SHA: `ba504e526e4cfd40873b0e2f9c04634667143de9`;
- parent Draft PR: #280;
- Wave 69 branch: `feature/storefront-ritual-house-wave69`;
- Wave 69 Draft PR base: `feature/storefront-derma-studio-wave68`.

Parallel `main`, Email Builder, Visual Builder, Template Library UX and Roadmap movement stays external. Wave 69 does not rebase or import it.

## Original Ritual House provenance

Original implementation: **Wave 13 / PR #136**.

- original implementation head: `115e0c9039bae729708becbd5957f562cd5ff945`;
- original final documentation head: `fdb608a02b0988ae837eced42c0d2fccdd6d073f`;
- original canonical template blob: `e3f1526c695e15f142a457d7dfdf3a82fbf22326`;
- original final template blob: `e3f1526c695e15f142a457d7dfdf3a82fbf22326`.

Historical re-acceptance: **Wave 31 / PR #177**.

- final accepted head: `76195ce657fa28e12bc07c1a683919865128f67d`;
- re-accepted template blob: `6c666e635686d66d00df591725b1beff53ae133e`.

Historical current-baseline counterpart: **Wave 50 / PR #246**.

- final accepted head: `b1a32de10c23fb76fb30c66272ae1d1135f7d7cc`;
- accepted template blob: `6c666e635686d66d00df591725b1beff53ae133e`;
- one commit, three Wave-specific files;
- canonical `ritual-house.ts` unchanged in Wave 50.

Current inherited canonical blob at the exact Wave 68 final head:

`6c666e635686d66d00df591725b1beff53ae133e`

Result: **byte-identical to the accepted Wave 50 template**.

## Historical drift and current status

Ritual House did have a historical hardening delta between the original Wave 13 blob and Wave 31. Wave 31 aligned the inherited template with then-current shared Builder/runtime authority by:

- composing the Atmosphere Hero from shared Story + Visual primitives rather than a Ritual-local renderer;
- exposing image, overlay, decoration, eyebrow, heading, copy, primary CTA and secondary CTA as independent Builder layers;
- aligning `commerce.review-summary` to shared `rating`, `count`, `label` config/bindings with null-safe rating/count fallback;
- moving Journal data onto the allowlisted shared `content.journal.items` binding;
- removing duplicate Catalog node identity;
- using the shared presentation-only `commerce.key-specs` contract for structured display;
- preserving the actual 7/12 gallery + 5/12 buybox desktop/tablet grid and 12/12 mobile grid;
- keeping mood/ritual as editorial merchandising rather than medical, aromatherapy-efficacy or psychological authority.

Wave 50 then proved that the hardened source required **no additional current-baseline repair**. The Wave 68 parent still contains exactly that Wave 50 accepted blob. Therefore Wave 69 does not replay the historical patch and does not manufacture canonical source churn.

No current shared runtime, component registry, Page Schema allowlist or binding namespace widening is needed or authorized by Wave 69.

## Ritual House canonical character

Protected merchandising journey:

`mood → ritual → format → scent or ingredient → product`

Protected visual DNA:

- smoked umber background;
- warm taupe surfaces;
- soft ivory text;
- candle amber accent;
- muted sage secondary;
- soft editorial serif display;
- clean warm sans UI;
- candle / diffuser / oil / cream / bath / steam / texture imagery;
- slow, generous, cocooning spacing.

Ritual House remains distinct from Beauty Lab and Derma Studio. It is not clinical skincare, a medical-clinic UI, a diagnostic surface, a treatment/cure system, a medical-aromatherapy engine, a sleep/stress/anxiety outcome system, a psychological assessment system, a black-box wellness score, or a pure home-decor store.

`mood` is merchant/editorial taxonomy, never psychological-state inference. `ritual` is editorial merchandising/navigation, never a health protocol.

## Exact Home composition and Builder contract

The protected Home sequence remains:

`Atmosphere Hero → Ritual by Mood → Bath & Body → Home Fragrance → Evening Ritual Story → Featured Ritual Sets → Scent & Ingredient Notes → Reviews → Journal → Footer`

The Atmosphere Hero remains shared layered composition with independently editable:

1. image;
2. overlay;
3. decoration;
4. eyebrow;
5. heading;
6. copy;
7. primary CTA;
8. secondary CTA.

Marketing images are not authority for baked-in copy, price, rating, stock, product fact, wellness claim or CTA. Evening Ritual and Journal remain shared E10 editorial/story content.

Hierarchy remains `Template → Page Presets → Section Presets → Components` with stable page-local node identity, shared binding paths, Desktop/Tablet/Mobile support and all 14 Page Schema presets.

## Shared authority contract

Ritual House composes shared engines only:

- **E1**: Storefront Runtime / Page Schema authority;
- **E2**: Product Discovery authority;
- **E7**: authoritative structured scent, format, ingredient, usage, product attribute and ritual-profile data when supplied;
- **E10**: merchant-authored atmosphere, ritual inspiration and Journal editorial content;
- **E13**: provider-neutral checkout authority.

E7 or authoritative shared product bindings are the only source of structured sellable/product truth. Missing structured facts fail closed to empty/null presentation. Ritual House does not create a local scent registry, ingredient truth store, efficacy authority, aromatherapy claim authority, product truth persistence, price/inventory authority or recommendation engine.

E10 cannot become a treatment plan, sleep recommendation engine, stress/anxiety assessment, psychological profile, medical advice or aromatherapy efficacy authority.

## Review and PDP hardening

The current shared `commerce.review-summary` contract remains `rating`, `count`, `label`. Ritual House binds it only to `reviews.rating`, `reviews.count`, `reviews.label`; missing rating/count remains `null`, never fabricated `0 / 0` evidence.

The actual PDP nodes remain:

- `ritual-product-gallery`: 7/12 desktop, 7/12 tablet, 12/12 mobile;
- `ritual-product-buybox`: 5/12 desktop, 5/12 tablet, 12/12 mobile.

These are executable node assertions, not metadata-only claims.

## Page Schema, install and demo invariants

Wave 69 acceptance revalidates:

- all 14 presets and page-local node-ID uniqueness;
- Home, Catalog, Search, Product, Content/Ritual Guide, Blog/Journal and Checkout through the shared validator;
- all bindings inside existing shared namespaces;
- Alap capability compatibility;
- draft-only installation;
- demo namespace `beauty-ritual-house`;
- demo fixtures remain non-authoritative and wellness-claim neutral;
- installation mutates storefront page drafts only, not products, variants, pricing, inventory, customers, orders or B2B authority;
- checkout remains provider-neutral E13.

## Minimal Wave 69 batch

Because the current inherited template is byte-identical to Wave 50 accepted source and passes the current shared contract, Wave 69 changes exactly three Wave-specific files:

1. `docs/STOREFRONT_RITUAL_HOUSE_WAVE69_REACCEPTANCE.md`;
2. `src/lib/builder/templates/ritual-house-wave69-acceptance.ts`;
3. `tests/storefront-ritual-house-wave69-reacceptance.test.ts`.

The canonical `src/lib/builder/templates/ritual-house.ts` is intentionally untouched.

The full quality suite must keep both historical Wave 50 Ritual House acceptance and Wave 68 Derma Studio predecessor acceptance green on the exact Wave 69 head.

## Read-only baseline before Wave 69 mutation

GitHub:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- Wave 68 exact head: `ba504e526e4cfd40873b0e2f9c04634667143de9`;
- PR #280: open Draft, base `feature/storefront-statement-lab-wave67`, exact Wave 68 head, one commit, three files, +622/-0;
- Wave 68 exact-head CI run `34618144331`: SUCCESS;
- Wave 68 quality artifact `10271512385`, SHA-256 `14676ad6571ac16dafbb7f8315351c8a1452315fe5c994d1a0e329ed177e52fb`;
- Wave 68 release artifact `10270558226`, SHA-256 `4e878e4070e5e8a79eaaa37bcbcfdeb4fb7588f0e9a1bfebbc77e89841584b0f`.

Vercel:

- Wave 68 preview `dpl_CNsNFCeATpN8przhVUmArLKLhsZF`: READY, `target:null`, exact Wave 68 Git SHA/ref/PR #280;
- production remains `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA`, target `production`, Git SHA `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`.

Supabase read-only state:

- `waterk-platform`: ACTIVE_HEALTHY;
- `waterk-staging`: ACTIVE_HEALTHY;
- `Shoperation Fresh Install`: INACTIVE.

Water-K read-only invariants:

- slug `water-k`;
- status `pilot`;
- plan `pro`;
- products 1;
- variants 3;
- orders 8;
- storefront pages 14;
- storefront page revisions 14.

The 14/14 storefront state remains external parallel movement and is not reconciled by Wave 69.

## Customer baseline boundary

The exact Wave 68 parent carries customer baseline manifest blob `60b6705ec860849c563f6832460e3c7996f4e433` with:

- `status=ready`;
- `sourcePolicy=schema-snapshot-only`;
- `defaultPlan=alap`;
- `freshInstallProofRequired=false`;
- proof SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 69 introduces no SQL, migration or sellable customer-schema change. Fresh Install proof remains SKIPPED and the Fresh Install project remains inactive.

## Explicit non-scope

Wave 69 does not authorize canonical Ritual House source churn without proven current drift; shared runtime/Page Schema/component registry/binding namespace widening; template-local Builder/layout/recommendation/mood/wellness/scent/ingredient/product/pricing/inventory/checkout/payment authority; medical, diagnostic or psychological authority; fabricated product or wellness facts; SQL/customer-baseline migration; Supabase mutation; Water-K status/plan/commerce mutation; 14/14 storefront reconciliation; K&H/vPOS changes; parallel `main` import/rebase; Visual Builder, Email Builder, Template Library UX or Roadmap work; production deployment; `main` merge; or Wave 70 implementation.
