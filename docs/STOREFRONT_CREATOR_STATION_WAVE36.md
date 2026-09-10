# Storefront Scale-out Wave 36 — Creator Station Re-acceptance & Builder Hardening

## Scope reconstruction

Wave 36 re-accepts the already-existing canonical **Creator Station** template directly after the fully closed Table & Gift Wave 35. This is reconstructed from the accepted historical scale-out chain rather than invented as a new roadmap slot:

- original Wave 14: Alpine Lodge → re-acceptance Wave 33;
- original Wave 15: Gallery Edit → re-acceptance Wave 34;
- original Wave 16: Table & Gift → re-acceptance Wave 35;
- original Wave 17: Creator Station → therefore re-acceptance Wave 36;
- original Wave 18: Spec Lab follows Creator Station and confirms the historical ordering.

Canonical identity remains:

- template key: `tech.creator-station`;
- template version: `1`;
- category: `electronics-tech`;
- demo namespace: `tech-creator-station`;
- minimum plan: `alap`.

Branch:

`feature/storefront-creator-station-wave36`

Stacked base branch:

`feature/storefront-table-gift-wave35`

Exact accepted Wave 35 baseline:

`f83d1f3bfad426ba1a74346ebf3f525798e5669f`

Accepted implementation head before this documentation commit:

`6d1542ceba422e56f550f2157ccd948f3fd36fbe`

## Accepted Creator Station direction

Creator Station remains:

**dark digital creator workflow commerce × setup building × explainable compatibility × creator education**

Accepted creator workflows remain:

- YouTube;
- Podcast;
- Stream;
- Fotó;
- Short Video;
- Home Studio.

Visual DNA remains:

- deep graphite/charcoal background;
- neutral dark panels;
- cool white text;
- controlled cyan primary accent;
- controlled magenta/violet secondary accent;
- REC orange/red warning language;
- signal green compatibility state;
- technical grotesk display typography;
- clean sans-serif interface typography;
- monospace timecode/data typography;
- timeline, waveform, timecode, audio meter, port node and connection-chain motifs.

Explicit exclusions remain:

- white-background hero/block treatment;
- sterile SaaS dashboard look;
- cold generic tech dashboard duplication;
- uncontrolled RGB chaos;
- fabricated compatibility;
- fabricated performance guarantees.

## Shared engine and authority contract

Wave 36 preserves the historical accepted full-experience contract exactly:

- **E1** shared Storefront Runtime / Page Schema;
- **E2** catalog and channel eligibility authority;
- **E3** creator workflow Finder / guidance;
- **E5** slot-based creator setup Configurator;
- **E6** explainable device/workflow compatibility;
- **E7** structured system requirements and technical product truth;
- **E10** Creator Magazine/tutorial editorial read-model presentation;
- **E13** provider-neutral cart/checkout and final validation.

Required full experience remains:

`E1 + E2 + E3 + E5 + E6 + E7 + E10 + E13`

Authority rule remains:

`workflow-guidance-and-setup-presentation-never-invent-price-stock-compatibility-performance-or-order-authority`

The template is not authority for:

- product or channel eligibility;
- price or compare-at price;
- inventory or stock availability;
- variants;
- reviews;
- compatibility truth;
- structured product truth;
- checkout outcome;
- payment state.

Compatibility remains explainable. `unknown` never means compatible, final validation remains server-side, and silent replacement is prohibited.

## Exact Home contract

The accepted Home sequence remains unchanged:

1. Build Your Workflow
2. Visual Equipment Chain
3. Timeline
4. Setup Scenes
5. Compatibility Checker
6. System Requirements
7. Starter / Advanced / Studio
8. Creator Magazine
9. Footer

Wave 36 does not add a separate white hero or another creator-specific route engine.

## Wave 36 Builder hardening

The hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Stable node IDs and stable content/read-model binding paths are retained. Wave 36 does not implement drag/drop, live canvas, inline editing or a Creator Station-specific Builder engine.

### Runtime binding correction discovered during hardening

The inherited Creator Station template still contained two historical binding namespaces that the current shared runtime does not allow:

- `workflow.*`;
- `story.*`.

The current shared runtime namespace allowlist does not contain either namespace. Wave 36 does **not** weaken or expand that shared allowlist.

The inherited workflow/setup read-model paths were corrected to the already-existing shared E5 namespace:

- `workflow.timeline` → `configurator.timeline`;
- `workflow.systemRequirements` → `configurator.systemRequirements`;
- `workflow.tiers.products` → `configurator.tiers.products`;
- `workflow.tiers.rows` → `configurator.tiers.rows`;
- `workflow.tiers.compareHref` → `configurator.tiers.compareHref`.

The inherited Creator Magazine binding was corrected from `story.creatorMagazine.items` to the existing allowed E10 presentation namespace:

- `content.creatorMagazine.title`;
- `content.creatorMagazine.items`.

This is template contract hardening only. It creates no new engine and changes no shared authority.

### E3 Finder hardening

The existing shared `guided.finder` and `guided.results` components remain the only Finder surfaces. Wave 36 exposes their supported Builder binding slots using stable content bindings for presentation and shared `finder.*` paths for dynamic state.

Examples:

- `content.buildYourWorkflow.*`;
- `content.workflowFinder.*`;
- `finder.currentStep.*`;
- `finder.currentQuestion.*`;
- `finder.progressLabel`;
- `finder.resultHref`;
- `finder.resultStatus`.

E3 remains guidance/ranking only; it cannot override E2 eligibility.

### E5 setup/configurator hardening

The shared E5 Configurator remains the only setup authority/read-model surface. Wave 36 hardens:

- Visual Equipment Chain;
- Timeline;
- Starter / Advanced / Studio comparison presentation;
- Content Setup Builder;
- Cart configuration summary;
- Account saved-setup summary.

Static presentation labels/copy remain under `content.*`; workflow/setup state remains under `configurator.*`.

No template-local workflow/configurator engine, fixed setup price, stock claim or compatibility shortcut is introduced.

### E6 compatibility hardening

Home, PDP and Content Builder compatibility nodes remain on shared `compatibility.*` bindings. Compatibility evidence is explanatory only and cannot mutate catalog eligibility, price, stock, variant state or checkout outcome.

### E7 structured product hardening

System Requirements, PDP key specs, grouped specifications, compare action and catalog facets continue to use shared structured-product components.

PDP commerce truth remains external through shared bindings including:

- `product.gallery`;
- `product.name`;
- `pricing.displayPrice`;
- `pricing.compareAtPrice`;
- `inventory.stockLabel`;
- `variant.optionOptions`;
- `product.keySpecs`;
- `product.specGroups`;
- `commerce.purchaseHref`;
- `recommendations.products`.

### E10 editorial hardening

Creator Magazine remains an editorial read-model presentation surface. Wave 36 exposes stable title/items bindings under `content.creatorMagazine.*` and removes the inherited invalid `story.*` dependency without introducing a new Story engine.

### Simple page presets

Blog Index, Blog Article, FAQ, Contact, Legal and Not Found keep the existing shared primitive structure and now expose stable:

- `content.<pageType>.title`;
- `content.<pageType>.copy`.

## Product page responsive contract

The accepted PDP grid remains unchanged:

- Desktop: gallery 7/12, buybox 5/12;
- Tablet: gallery 7/12, buybox 5/12;
- Mobile: gallery 12/12, buybox 12/12.

## Page package and installation boundary

The canonical package remains all 14 Alap-compatible Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / Creator Workflow Builder
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

Content role remains `creator-workflow-builder` with `E3+E5+E6+E7` integration.

Desktop / Tablet / Mobile manifest support remains enabled. Installation remains draft-only and cannot mutate authoritative products, variants, customers, orders or B2B ownership.

## Checkout boundary

Checkout remains shared **E13 provider-neutral checkout**. Wave 36 introduces no:

- K&H/vPOS logic;
- merchant secret or credential;
- callback/process/status handling;
- payment-state authority;
- provider-specific checkout implementation.

## CI acceptance execution

The repository Vitest include remains:

`tests/**/*.test.ts`

The inherited historical regression `tests/storefront-creator-station-template.test.tsx` is therefore not used as Wave 36 closure evidence.

Wave 36 adds the CI-executed acceptance file:

`tests/storefront-creator-station-wave36-reacceptance.test.ts`

It contains **10 acceptance tests** covering:

1. canonical inherited v1 identity and exact E1/E2/E3/E5/E6/E7/E10/E13 contract;
2. dark creator-workflow visual identity and exact nine-step Home sequence;
3. complete E3 Finder/search binding surfaces and authority boundaries;
4. complete E5 workflow/configurator surfaces plus `workflow.*` removal without allowlist widening;
5. E6 explainable compatibility and Unknown semantics;
6. E7 structured-product/compare surfaces plus shared price/stock/variant authority;
7. E10 Creator Magazine through allowed `content.*` bindings and `story.*` removal;
8. unique node identity, all 14 Alap presets, simple-page bindings, shared tokens and D/T/M validation;
9. PDP 7/5 → 12/12 responsiveness, draft installation and claim-neutral fixtures;
10. provider-neutral E13 and SQL/production/payment/main/Visual Builder side-effect boundaries.

## Accepted implementation CI

Accepted implementation head:

`6d1542ceba422e56f550f2157ccd948f3fd36fbe`

GitHub **CI #2351 / Actions run `34507828381`: SUCCESS**.

Verified gates:

- production dependency security audit: PASS;
- customer database baseline guard: PASS;
- quality: **224 unique test files / 450 suites / 1605 tests PASS**;
- passed tests: 1605;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 36 acceptance: **10 / 10 PASS**, explicitly present in the downloaded quality artifact;
- TypeScript: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED because Wave 36 introduces no database migration.

Implementation quality artifact:

- artifact id: `10164556133`;
- digest: `sha256:62cf2b7b8e2412f58b4802a278a6957455532a0ab3cbbf8da41fb5d4e1703402`;
- artifact was actually downloaded and `test-results.json` inspected.

Implementation release-manifest artifact:

- artifact id: `10164605497`;
- digest: `sha256:ced3413380f1b7032372b234916752272706e8fcc735231bc3af8096aed1b3a5`;
- artifact was actually downloaded and `release-manifest.json` inspected;
- version: `v24`;
- SHA: `6d1542ceba422e56f550f2157ccd948f3fd36fbe`;
- ref: `feature/storefront-creator-station-wave36`;
- environment: `ci`;
- release hash: `3b99d47123b62526a4643587f8c2d7430fd00015e513396a21c1abf16c2da2c0`.

## SQL / production boundary

Wave 36 is code-only and requires no SQL or migration.

At Wave 36 live-baseline verification, production had independently advanced after the historical Wave 35 closure because of an unrelated Team Chat fix. The verified production boundary was:

- production main SHA: `2f9c1b124cd4e894585c9dde8ebefb7e2acf3963`;
- production Vercel deployment: `dpl_Csj9fBi3oc8RJFniWswbnp4u8SDR`;
- production state: `READY`;
- target: `production`.

That independent production state is not part of the stacked storefront branch and Wave 36 does not promote anything to production.

Production Supabase at baseline:

- project: `waterk-platform`;
- ref: `ewdederyvnwmghlydbno`;
- state: `ACTIVE_HEALTHY`.

Water-K remained:

- status: `pilot`;
- subscription plan: `pro`.

Wave 36 introduces no Supabase mutation, no Water-K tenant-status change and no `main` merge.

Automatic Git integration Preview deployments are permitted and are not production rollout.

## Final documentation-head verification

This documentation commit is the docs/evidence head candidate for Wave 36. Closure requires a new full GitHub CI on this exact documentation HEAD and fresh download/inspection of both final `quality-test-results` and `release-manifest` artifacts.

The final exact-head totals, Wave 36 10/10 regression presence, release hash, exact Wave35→Wave36 diff, stacked Draft PR server-side state, final Preview state and unchanged production/Supabase/Water-K boundary are recorded in the stacked Draft PR as exact-head external closure evidence to avoid an evidence-commit loop.

## Closure rule

Wave 36 is fully closed only after:

1. this documentation HEAD passes full exact-head CI;
2. final quality and release-manifest artifacts are actually downloaded and inspected;
3. final exact totals and Wave 36 10/10 acceptance presence are verified;
4. final exact diff is verified against Wave 35 accepted head `f83d1f3bfad426ba1a74346ebf3f525798e5669f`;
5. a stacked Draft PR targets `feature/storefront-table-gift-wave35`;
6. PR is open, Draft, not merged, mergeable, rebaseable and clean after preview status settles;
7. Vercel Preview is READY while production remains unpromoted by Wave 36;
8. production Supabase remains unchanged;
9. Water-K remains `pilot` / `pro`;
10. checkout remains provider-neutral E13;
11. Wave 37 is not started.
