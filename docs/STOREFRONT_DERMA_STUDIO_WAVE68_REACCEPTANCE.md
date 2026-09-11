# Storefront Wave 68 — Derma Studio Re-acceptance & Builder Hardening

## Canonical successor reconstruction

Wave 68 is the repository-proven direct successor to Wave 67 Statement Lab: **Derma Studio (`beauty.derma-studio` v1) Re-acceptance & Builder Hardening**.

This scope is reconstructed from repository evidence, not inferred from the wave number:

1. Original scale-out history places Statement Lab at Wave 11 / PR #133 and Derma Studio immediately after it at Wave 12 / PR #135.
2. Historical re-acceptance repeats the same order: Statement Lab Wave 29 is followed by Derma Studio Wave 30 / PR #175.
3. Current-baseline hardening repeats it again: Statement Lab Wave 48 is followed by Derma Studio Wave 49 / PR #243, with Derma Studio stacked after the Statement Lab checkpoint.
4. The current cycle has Wave 67 / PR #279 as Statement Lab, so the same repository ordering resolves Wave 68 to Derma Studio.
5. `src/lib/builder/storefront-template-catalog.ts` still registers the single canonical `DERMA_STUDIO_TEMPLATE_PACKAGE`; no replacement or parallel Derma Studio implementation exists.

There is no repository evidence for an intervening template or release/reconciliation checkpoint between Statement Lab and Derma Studio in this cycle. Therefore the canonical Wave 68 scope is **Derma Studio Re-acceptance & Builder Hardening**.

## Exact stack boundary

Wave 68 starts directly from the fully accepted Wave 67 exact final head:

- parent branch: `feature/storefront-statement-lab-wave67`;
- parent exact SHA: `f9d6f2573f578fc9ec9df11b6f93d1ec2257f8d8`;
- parent Draft PR: #279;
- Wave 68 branch: `feature/storefront-derma-studio-wave68`;
- Wave 68 Draft PR base: `feature/storefront-statement-lab-wave67`.

Parallel `main`, Visual Builder, Email Builder, Template Library UX and Roadmap movement stays external. Wave 68 does not rebase or import it.

## Original Derma Studio provenance

Original implementation: **Wave 12 / PR #135**.

- original implementation head: `631bc8bc9798388346e9a080abd38663ecf8739f`;
- original final documentation head: `52bb44be85c47ed364de69ee8a9e958df52cb830`;
- original canonical template blob: `febdb2e750d415d06159cb9135e3e6f5cd1f7597`;
- original final template blob: `febdb2e750d415d06159cb9135e3e6f5cd1f7597`.

Historical re-acceptance: **Wave 30 / PR #175**.

- final accepted head: `29751e3671ad9082dd3be914ab02070ff4e2bf11`;
- re-accepted template blob: `41ad1e161e566872e0381591f1dbae35d8939f5a`.

## Historical hardened counterpart

The direct hardened counterpart is **Wave 49 / PR #243**.

Contract-first acceptance failed closed at:

`460f492f86599b715aded338bb22fa44f20b0325`

The canonical Derma Studio blob at that fail-closed head was still:

`41ad1e161e566872e0381591f1dbae35d8939f5a`

Wave 49 then applied the minimal current-contract repair at:

`e0ca1465069b06bcab011f5bb358d3f9733c3684`

That commit is both the hardened implementation head and the final accepted Wave 49 head. The accepted hardened Derma Studio blob is:

`135a337655ffe6caa8d902b522f51d341d6abda2`

## Historical drift and current status

Wave 49 proved four concrete inherited drift groups:

1. duplicate node IDs;
2. stale / invalid Guided Navigation placement on Page Schema types that did not support it;
3. stale `commerce.review-summary` config/binding contract;
4. missing executable evidence that the **actual PDP buybox wrapper** is 5/12 desktop/tablet and 12/12 mobile.

The Wave 49 repair remained template-local and did not widen shared runtime, Page Schema allowlists, component registry or binding namespaces. It:

- restored page-local unique node IDs;
- used Guided components only where the shared Page Schema/registry allowed them;
- aligned `commerce.review-summary` to `rating`, `count`, `label` and authoritative review bindings;
- kept missing rating/count as `null` rather than fabricating zero evidence;
- retained actual PDP gallery responsive spans 7/12 desktop/tablet and 12/12 mobile;
- introduced/retained the actual responsive `derma-product-buybox` wrapper at 5/12 desktop/tablet and 12/12 mobile.

Current inherited Derma Studio blob at the exact Wave 67 final head:

`135a337655ffe6caa8d902b522f51d341d6abda2`

Result: **byte-identical to the accepted hardened Wave 49 template**.

Therefore Wave 68 does not replay the old patch and does not modify `src/lib/builder/templates/derma-studio.ts`. The executable acceptance contract revalidates all four historical drift groups against the current shared runtime and registry.

## Derma Studio canonical character

Derma Studio remains skincare commerce / educational merchandising with the journey:

`concern → routine → active ingredient → product`

It must remain distinct from:

- Statement Lab: contemporary object gallery / material-spec lab;
- Beauty Lab: formula → ingredient → texture → guided choice;
- Ritual House: mood → ritual → format → scent/ingredient.

Protected visual DNA:

- warm white;
- soft mineral grey;
- graphite;
- muted blue-green accent;
- soft clay secondary;
- clean editorial sans;
- precise UI sans;
- product macro / glass / texture / ingredient / routine imagery;
- airy, precise, educational spacing.

Explicit exclusions remain medical-clinic UI, diagnostic UI, treatment/cure claims, opaque recommendation score, fabricated clinical evidence and medical before/after claims.

## Builder and shared authority contract

Hierarchy remains `Template → Page Presets → Section Presets → Components`.

The Clinical Clarity Hero remains shared layered composition with independently editable:

- image;
- overlay;
- decoration;
- badge;
- title;
- copy;
- primary CTA;
- secondary CTA.

Wave 68 does not introduce a Derma-local Builder, layout engine, Page Schema authority, conditional renderer, recommendation engine, routine persistence authority, medical authority, product truth source or checkout/payment authority.

Required shared engines remain:

- E1: shared Page Schema / Storefront runtime;
- E2: shared Product Discovery authority;
- E3: deterministic, explainable, non-diagnostic concern/routine merchandising and navigation;
- E7: authoritative structured ingredient/active/routine-step/product facts when supplied;
- E13: shared provider-neutral checkout.

E3 may explain merchandising fit but cannot diagnose, classify disease, prescribe treatment, infer health state, own health records or emit opaque ML scores.

E7 and authoritative shared product bindings remain the only source of ingredient, active, routine-step and structured product truth. Missing authoritative facts fail closed to empty/null values; Derma Studio does not fabricate concentration, clinical evidence, efficacy, treatment or cure facts.

## Historical drift gates on current runtime

Executable Wave 68 acceptance revalidates:

- unique node IDs on every preset, with explicit Catalog/Search/Content/Product coverage;
- Guided components only on page types accepted by the current shared validator/registry;
- current `commerce.review-summary` config keys `rating`, `count`, `label` only;
- review bindings `reviews.rating`, `reviews.count`, `reviews.label` only, with `null` rating/count fallback;
- actual PDP gallery: 7/12 desktop, 7/12 tablet, 12/12 mobile;
- actual `derma-product-buybox`: 5/12 desktop, 5/12 tablet, 12/12 mobile;
- no shared allowlist, registry or binding-namespace widening.

## Page Schema, install and commerce invariants

Wave 68 acceptance revalidates:

- all 14 Page Schema presets;
- Desktop / Tablet / Mobile manifest support;
- Alap minimum-plan compatibility;
- stable page-local node identities and shared binding namespaces;
- exact Home sequence `Clinical Clarity Hero → Shop by Concern → Routine Finder → Active Ingredient Index → Routine Steps → Targeted Formulas → Ingredient Education → Reviews → Footer`;
- draft-only installation;
- demo namespace `beauty-derma-studio`;
- demo fixtures remain non-authoritative and claim-neutral;
- template installation mutates storefront page drafts only, not products, variants, pricing, inventory, customers, orders or B2B authority;
- provider-neutral E13 checkout with no K&H/vPOS/provider-specific authority in the template.

## Minimal Wave 68 batch

Because the current canonical template is byte-identical to the accepted Wave 49 hardened version and current shared contracts accept the inherited implementation, Wave 68 changes exactly three Wave-specific files:

1. `docs/STOREFRONT_DERMA_STUDIO_WAVE68_REACCEPTANCE.md`;
2. `src/lib/builder/templates/derma-studio-wave68-acceptance.ts`;
3. `tests/storefront-derma-studio-wave68-reacceptance.test.ts`.

The canonical `src/lib/builder/templates/derma-studio.ts` is intentionally untouched.

The full quality suite must keep both historical Wave 49 Derma Studio acceptance and Wave 67 Statement Lab predecessor acceptance green on the exact Wave 68 head.

## Read-only baseline before Wave 68 mutation

GitHub:

- `main`: `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- Wave 67 exact head: `f9d6f2573f578fc9ec9df11b6f93d1ec2257f8d8`;
- PR #279: open Draft, base `feature/storefront-heritage-atelier-wave66`, head exact Wave 67 SHA, one commit, three files, +550/-0;
- Wave 67 exact-head CI run `34609348876`: SUCCESS;
- Wave 67 quality artifact `10267157975`, SHA-256 `de2ebb067b22fd5953f3c6dea4423917db42aa243d8dab1c9b457b422523b5c8`;
- Wave 67 release artifact `10267822545`, SHA-256 `681adb507dbd2d7b15931507aac1e9d34b19f3696cd842c671cbe44437678860`.

Vercel:

- Wave 67 preview `dpl_6DLYjzDcoJ73XCbE5z9mDNRofoTF`: READY, `target:null`, exact Wave 67 SHA/ref/PR #279;
- preview is Deployment Protection / SSO protected; the current connector fetch receives an SSO redirect and is not classified as anonymous application-smoke PASS;
- production deployment remains `dpl_9MCZyq6J2JRPRWza6aShHv7DxexA`, target `production`, Git SHA `d6d90bb1bcccbf3a8155dda5611bf3078c7c4b39`;
- production `/api/health`: HTTP 200, `status=ok`, `database=ok`, version `d6d90bb1bccc`.

Supabase read-only state:

- `waterk-platform` (`ewdederyvnwmghlydbno`): ACTIVE_HEALTHY;
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

The 14/14 storefront state is parallel external movement and is not reconciled by Wave 68.

## Customer baseline boundary

The exact Wave 67 head carries customer baseline manifest blob:

`60b6705ec860849c563f6832460e3c7996f4e433`

Manifest invariants:

- `status=ready`;
- `sourcePolicy=schema-snapshot-only`;
- `defaultPlan=alap`;
- `freshInstallProofRequired=false`;
- proof contract SHA-256 `c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618`.

Wave 68 introduces no SQL, migration or sellable customer-schema change. The customer baseline remains byte-identical, Fresh Install proof remains SKIPPED and the Fresh Install project remains inactive.

## Explicit non-scope

Wave 68 does not authorize:

- canonical Derma Studio source churn without current drift;
- medical/diagnostic/treatment/cure authority;
- template-local recommendation, routine, ingredient, concentration, clinical-evidence, efficacy or product-truth authority;
- template-local Builder/layout/Page Schema/checkout/payment authority;
- shared runtime/Page Schema/component registry/binding namespace widening;
- fabricated price, stock, rating, product, ingredient or medical facts;
- SQL/customer-baseline migration;
- production/staging Supabase mutation;
- Water-K status, plan or commerce mutation;
- 14/14 storefront reconciliation;
- K&H/vPOS/payment authority changes;
- import/rebase of parallel `main` work;
- Visual Builder, Email Builder, Template Library UX or Roadmap work;
- production deployment;
- `main` merge;
- Wave 69 implementation.
