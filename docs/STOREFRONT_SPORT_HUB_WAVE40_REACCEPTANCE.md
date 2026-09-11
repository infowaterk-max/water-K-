# Storefront Scale-out Wave 40 — Sport Hub Re-acceptance & Builder Hardening

## Closure model

Wave 40 re-accepts the historical Wave 21 **Sport Hub** package on the current Storefront Runtime / Builder contract. This branch is stacked directly on the accepted Wave 39 Loot Vault evidence HEAD and is intentionally not merged to `main` or deployed to production.

- Base: `feature/storefront-loot-vault-wave39`
- Base SHA: `2dab503b464c54726e91bbe8b786088035a2150b`
- Wave 40 branch: `feature/storefront-sport-hub-wave40`
- Historical template wave: 21
- Canonical key: `sport.sport-hub`
- Category: Sport & Outdoor #8
- Role: broad mainstream multisport commerce hub
- Minimum plan: Alap
- Page presets: 14
- Demo namespace: `sport-sport-hub`
- Shared engine contract: `E1 + E2 + E7 + E10 + E13`

## Historical / canonical reconstruction

The repository sequence proves the identity without introducing a new roadmap item:

1. Historical PR #143 is Loot Vault (Wave 20).
2. Historical PR #144 is Sport Hub (Wave 21) and stacks directly on Loot Vault.
3. Historical PR #145 is Trail & Expedition (Wave 22) and stacks directly on Sport Hub.
4. The current canonical package still exposes `sport.sport-hub`, Sport & Outdoor positioning, 14 Alap page presets, `sport-sport-hub`, and the shared `E1/E2/E7/E10/E13` contract.
5. Existing Sport Hub regression coverage preserves the same identity and composition, while Wave 40 adds a real `tests/**/*.test.ts` acceptance gate so current CI actually executes the re-acceptance contract.

Canonical experience remains activity-first (`Milyen sportot űzöl?`) with six entry sports — futás, kerékpár, fitnesz, túra, úszás, labdajátékok — and Builder-editable Kezdő / Haladó / Profi navigation. Sport Hub remains a broad multisport storefront and does not duplicate Playroom gaming discovery, Loot Vault collector/drop commerce, Trail & Expedition route/expedition-first UX, or specialist Performance Lab authority.

## Authority boundary

Sport Hub is presentation/composition, not a parallel sports domain engine.

- E2 remains catalog/search/channel/product-eligibility authority.
- E7 remains structured product-fact authority when the merchant/product data actually supplies sport level, season, size, material or equipment facts.
- E10 supplies shared editorial/story presentation.
- E13 remains provider-neutral cart/checkout/final commerce authority.
- Price, compare-at price, stock, variants, reviews, product eligibility, checkout outcome and payment state are never template authority.
- No template-local sports engine, live-score engine, performance engine, payment-provider implementation or merchant secret is introduced.

## Current Builder contract

Hierarchy remains `Template → Page Presets → Section Presets → Components`.

Wave 40 keeps:

- stable node IDs;
- stable binding paths;
- shared design tokens;
- shared responsive Desktop / Tablet / Mobile grid;
- Alap entitlement;
- future Visual Builder compatibility;
- no drag-and-drop/live-canvas/inline-editing implementation in this wave.

The current shared component and binding allowlists were **not widened** for Sport Hub.

## Gate findings and hardening

The re-acceptance gate intentionally ran against the current shared Story registry and storefront runtime rather than reproducing the old Wave 21 test assumptions.

### First failing gate

- CI run: `34521447342` (run #2428)
- Head: `389041c7657a64a83d63564229f9a4a7ebcb265c`
- Result: FAIL in Quality tests
- Failed quality artifact: `10169833094`
- Artifact digest: `sha256:470560094f6d69db7118470522e97474b0983da977db40bcea5bf9bf0e9203a8`

The downloaded artifact proved two real inherited template defects plus one acceptance-metadata defect:

1. Catalog had a duplicate `sport-catalog-header` node ID. The collection header is now `sport-catalog-collection-header`.
2. The Content preset used `story.index`, which the current shared Story registry permits on Home / Blog Index, not Content. The Content preset now uses the shared `story.body` component.
3. The acceptance contract contained a customer-specific literal in non-scope metadata; it was replaced by the customer-neutral `tenant-status-change` wording.

No shared runtime/engine contract was loosened.

### Second failing gate

- CI run: `34521924115` (run #2431)
- Head: `a2bbe58daa6253135529c1b72b37dac760f4887c`
- Result: FAIL in Quality tests
- Failed quality artifact: `10170017843`
- Artifact digest: `sha256:6e09a157bf968850b859eff662a8899818edd060180431eb2e44bc034e3d2354`

The downloaded artifact showed the replacement `story.body` component was correct, but its provisional `story.current.*` bindings were outside the current storefront binding allowlist. The adapter was corrected to existing allowed `content.guideBody.blocks` / `content.guideBody.relations` bindings. The shared binding allowlist remained unchanged.

## Accepted implementation evidence

Accepted implementation HEAD:

`76f6b264171684d7f383d2b973d5e1f8f9b4ef83`

Full CI:

- run #2433
- Actions run `34522161742`
- result: **SUCCESS**
- Quality tests: SUCCESS
- TypeScript check: SUCCESS
- Production build: SUCCESS
- Release manifest generation/upload: SUCCESS
- Security audit: SUCCESS

Downloaded quality artifact:

- artifact: `10170103533`
- digest: `sha256:a46fd7327ee5e2b978182210847c3a92b7b3917b87df8e48a6c8f56f7fa49219`
- extracted `test-results.json` sha256: `7ddbe61c2eae7ee7706717478c8fb45b09179f3f1af100b52f8c46f1830fa2f7`
- unique test files: 228
- suites: 458 / 458 PASS
- tests: 1649 / 1649 PASS
- failed: 0
- pending: 0
- todo: 0
- Wave 40 acceptance: 10 / 10 PASS

Downloaded release artifact:

- artifact: `10170149910`
- digest: `sha256:ca6e4fb44c92c0d1ae426900e263351e4aeebc9c61297e95d318e7ff5a197177`
- extracted `release-manifest.json` sha256: `8bf45f5f5a699da458b7422fa18c3228342fceee988d6b5935cfbb78f684495b`
- release version: `v24`
- manifest SHA: `76f6b264171684d7f383d2b973d5e1f8f9b4ef83`
- release hash: `984cf291ded060131c2a1e5d15002652d1642c207ee8d085244695bddb9a4f5a`

Both artifacts were downloaded and their extracted contents inspected before this evidence commit.

## Exact Wave 39 → implementation diff

Comparison:

`2dab503b464c54726e91bbe8b786088035a2150b...76f6b264171684d7f383d2b973d5e1f8f9b4ef83`

- ahead: 5 commits
- behind: 0
- changed files: 3
- `src/lib/builder/templates/sport-hub-wave40-acceptance.ts` — added
- `src/lib/builder/templates/sport-hub.ts` — only 3 additions / 3 deletions for current-contract hardening
- `tests/storefront-sport-hub-wave40-reacceptance.test.ts` — added
- no SQL/migration
- no shared storefront runtime/engine modification

## Live boundary before implementation

At Wave 40 start:

- Wave 39 branch still pointed to `2dab503b464c54726e91bbe8b786088035a2150b`.
- Wave 39 PR #213 remained open Draft and not merged.
- `main` had independently advanced to `d417f88276c2e7c3c026cf245f6e65d847199ced` because of non-storefront roadmap work.
- Vercel production was READY on the independently advanced `main` SHA.
- Wave 39 preview remained READY and non-production.
- Supabase `waterk-platform` (`ewdederyvnwmghlydbno`) was `ACTIVE_HEALTHY`.
- Water-K tenant remained `pilot / pro`.

Wave 40 makes no Supabase mutation and no production deployment. Final CI, exact diff, stacked Draft PR mergeability, final Vercel preview and production boundary, and the unchanged Supabase/tenant state are verified on this documentation/evidence HEAD after this commit.

## Explicit non-scope

No `main` merge, production deploy, SQL/migration, Supabase mutation, tenant-status change, Visual Builder drag/drop/live canvas/inline editing, template-local sports/live-score/performance engine, or payment-provider implementation belongs to Wave 40. Wave 41 must not start until this Wave 40 final evidence HEAD is fully accepted.
