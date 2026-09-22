# Storefront Scale-out Wave 32 — Beauty Lab Re-acceptance & Builder Hardening

## Scope

Wave 32 re-accepts and hardens the inherited canonical `beauty.beauty-lab` v1 template on the exact accepted Wave 31 stacked baseline. It does **not** create a second Beauty Lab template and does not introduce a template-local layout, hero, recommendation, routine, commerce, medical, pricing, inventory, review, order or checkout authority engine.

Branch:

`feature/storefront-beauty-lab-wave32`

Stacked base branch:

`feature/storefront-ritual-house-wave31`

Exact accepted Wave 31 base:

`76195ce657fa28e12bc07c1a683919865128f67d`

Accepted implementation head before this documentation commit:

`3a7019f596416e586c08616b71c874c764f04ec2`

## Canonical identity and Beauty-family separation

Beauty Lab remains the canonical inherited v1 package:

- template key: `beauty.beauty-lab`;
- template version: `1`;
- demo namespace: `beauty-beauty-lab`;
- minimum plan: `alap`.

The three Beauty & Wellness directions remain structurally distinct beyond palette changes:

- Beauty Lab: `formula → ingredient → texture → guided choice → product`;
- Derma Studio: `concern → routine → active ingredient → product`;
- Ritual House: `mood → ritual → format → scent or ingredient → product`.

Wave 32 preserves this separation in layout, section order, rhythm, typography, imagery and merchandising journey.

## Home merchandising contract

The accepted Beauty Lab Home order remains unchanged:

1. Formula Hero
2. Formula Finder
3. Shop by Concern
4. Ingredient Index Preview
5. New Formulas
6. Texture Lab
7. Routine Feature
8. Product Grid
9. Ingredient Story
10. Reviews
11. Footer

## Builder hardening

### Formula Hero

Formula Hero now uses the existing shared visual composition rather than a Beauty-specific hero engine:

- `visual.layered-canvas`;
- `visual.layer`.

The hero is independently editable through stable component nodes for:

1. image
2. overlay
3. decoration
4. badge
5. title
6. copy
7. primary CTA
8. secondary CTA

Stable binding roots remain under `content.formulaHero.*`.

Marketing copy, price, clinical evidence and CTA content are not baked into image assets.

### Major marketing blocks

`Routine Feature` and `Ingredient Story` use the existing shared `editorial.split-feature` contract. Their supported editable slots are bound through stable `content.routineFeature.*` and `content.ingredientStory.*` paths.

No template-local routine engine is introduced. Until a shared authoritative routine read-model exists, Routine Feature remains editorial/presentation-only.

### Reviews contract correction

The current-baseline CI-executed Wave 32 regression exposed a legacy Beauty Lab mismatch: the inherited Reviews node still attempted unsupported `summary` and `href` bindings even though shared `commerce.review-summary` owns only `rating`, `count` and `label` slots.

Wave 32 fixes the template, not the shared authority contract:

- only `rating`, `count`, `label` remain bound;
- rating/count fallback is `null`, so the template does not fabricate review evidence;
- no shared binding capability was broadened merely to satisfy the test.

## E3 Guided Finder authority and safety

Beauty Lab continues to consume the real shared E3 Guided Finder engine.

Accepted semantics remain:

- deterministic rule evaluation;
- explainable evidence;
- exact / partial / zero-result handling;
- tenant-scoped configuration;
- shared commerce/discovery eligibility filtering;
- ineligible products excluded;
- non-diagnostic safety policy;
- no opaque AI/black-box recommendation score.

The template cannot diagnose disease, infer a medical condition, prescribe treatment, claim a cure or fabricate efficacy evidence.

Template switching cannot mutate Finder authority, products, variants, pricing, inventory, customers or orders.

## E7 structured facts and authority boundaries

Ingredient, formula, texture and product facts are supplied only by authoritative shared product/structured-data bindings when present.

Beauty Lab does not invent:

- ingredient concentrations;
- efficacy;
- clinical results;
- certifications;
- stock or availability;
- pricing;
- ratings/reviews.

Pricing, inventory, variants, reviews and recommendations remain externally authoritative shared commerce bindings.

## Product page contract

PDP layout remains:

- Desktop: gallery 7/12, buybox 5/12;
- Tablet: gallery 7/12, buybox 5/12;
- Mobile: gallery 12/12, buybox 12/12.

Authoritative bindings remain responsible for gallery, product name/description, price/compare-at price, stock, structured formula/specification data, E3 explanation, purchase action and recommendations.

## Page package

Beauty Lab provides the required 14 Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Ingredient Index
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

The package remains Alap-compatible and declares Desktop / Tablet / Mobile support.

Installation remains draft-only. Template installation/switching cannot mutate authoritative merchant products, variants, customers, orders or B2B ownership.

## Checkout

Checkout remains shared, E13-bound and provider-neutral.

Wave 32 does not alter K&H/vPOS credentials, transaction behavior, payment status handling, provider selection or payment secrets.

## CI regression execution hygiene

The repository's current Vitest include contract executes `tests/**/*.test.ts`. Historical storefront `.test.tsx` files are therefore not accepted as Wave 32 evidence.

Wave 32 uses the CI-executed regression file:

`tests/storefront-beauty-lab-wave32-reacceptance.test.ts`

The obsolete non-running Wave 32 `.test.tsx` duplicate was removed rather than broadening the global Vitest include scope.

Wave 32 acceptance assertions on the accepted implementation CI: **11 / 11 PASS**.

## Accepted implementation CI

Implementation head:

`3a7019f596416e586c08616b71c874c764f04ec2`

GitHub **CI #2304 / Actions run `34492656623`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **220 unique test files / 442 suites / 1561 tests PASS**;
- passed: 1561;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 32 regression: 11 / 11 PASS and explicitly present in the quality artifact;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 32 introduces no database migration.

Quality artifact:

- artifact id: `10158425382`;
- digest: `sha256:f7b8052c0fdb0a606fcc5ed159e994e655682f202fcd72dcf160996b39ae5594`.

Implementation release manifest:

- artifact id: `10158479985`;
- artifact digest: `sha256:9f4d9679b8f18685b38db2090896d47a85482c5ae2167eb26b2073a411167c48`;
- version: `v24`;
- SHA: `3a7019f596416e586c08616b71c874c764f04ec2`;
- ref: `feature/storefront-beauty-lab-wave32`;
- environment: `ci`;
- release hash: `21234698882383323b39af7f2938aa12201d873ba574b8b11e838c9066ee5ef0`.

## Explicit no-deploy rule

Wave 32 does not trigger or authorize:

- merge to `main`;
- Vercel production deployment/promotion;
- Supabase production or staging mutation;
- SQL migration;
- K&H/vPOS/payment behavior changes;
- Water-K `pilot` status change.

An automatic branch Preview from Git integration, if any, is not a production rollout.

## Final documentation-head verification

This documentation commit is the final evidence/docs commit for Wave 32. Closure requires a fresh full GitHub CI on this exact documentation HEAD, followed by separate processing of its quality-test-results and release-manifest artifacts. Final test totals and the final documentation-head release hash are recorded as external exact-head closure evidence and do not require another commit, avoiding an evidence-commit loop.

## Closure rule

Wave 32 closes only when:

1. this documentation HEAD passes a fresh full exact-head GitHub CI;
2. final current-head quality and release-manifest artifacts are processed separately;
3. final exact test totals and final release hash are recorded;
4. final diff is verified against exact accepted Wave 31 head `76195ce657fa28e12bc07c1a683919865128f67d`;
5. the stacked Draft PR targets `feature/storefront-ritual-house-wave31`;
6. the PR is open, Draft, not merged and mergeable, preferably rebaseable and clean;
7. production, Supabase and payment behavior remain unchanged;
8. Water-K remains `pilot`.
