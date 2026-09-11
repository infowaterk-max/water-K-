# Storefront Scale-out Wave 39 — Loot Vault Re-acceptance & Builder Hardening

## Canonical scope reconstruction

Wave 39 re-accepts the repository's original **Wave 20 — Loot Vault** package directly after the accepted Wave 38 Playroom baseline.

Canonical identity:

- template: **Loot Vault**;
- template key: `gaming.loot-vault`;
- template version: `1`;
- portfolio position: **Gaming & Geek #8**;
- role: collector / merch / drop / preorder-oriented storefront, distinct from Playroom broad gaming discovery and Rig Forge PC configurator flows;
- standard package: 14 Alap-compatible Page Schema presets;
- demo namespace: `gaming-loot-vault`;
- current shared engine contract: `E1 + E2 + E7 + E10 + E13`;
- explicitly not required by Loot Vault v1: `E8`, `E9`;
- Collection Tracker remains deferred from v1.

The reconstruction is repository-evidence based, not inferred only from wave numbering:

1. `docs/STOREFRONT_LOOT_VAULT_WAVE20.md` states that original Wave 20 implements Loot Vault directly on Playroom / PR #142.
2. Historical Draft PR #143 is titled `Scale-out Wave 20 – Loot Vault`, has base `feature/storefront-playroom-wave19`, and closes on historical Loot Vault head `4f31d5a8e725e0ed28c914ce84280257d7001121`.
3. Historical Draft PR #144 is titled `Scale-out Wave 21 – Sport Hub` and explicitly stacks directly on Loot Vault / PR #143, using that exact Loot Vault final head as its base SHA.
4. The current canonical installable package and manifest still identify `gaming.loot-vault`, 14 page presets, minimum plan `alap`, and demo namespace `gaming-loot-vault`.
5. The original Wave 20 regression contract uses the shared Story/E10 component registry for Loot Vault's `story.*` surfaces.

Therefore the accepted historical sequence at this point is:

`Playroom (original Wave 19 → re-acceptance Wave 38)`
→ `Loot Vault (original Wave 20 → re-acceptance Wave 39)`
→ `Sport Hub (original Wave 21)`.

No Wave 40 scope is started or inferred here.

## Exact stacked baseline

Wave 39 branch:

`feature/storefront-loot-vault-wave39`

Exact branch creation base / accepted Wave 38 final HEAD:

`d884d80686ccb6793eb74a486488d631b797bd01`

Required stacked PR base:

`feature/storefront-playroom-wave38`

Wave 39 does not merge to `main` and does not authorize production rollout.

## Canonical experience contract

### Home composition

The recovered original Home order remains locked:

1. Vault Hero
2. Universe Selector
3. Limited / Exclusive / Preorder
4. Collector Selection
5. Vault Feature
6. Drop Alert
7. Join the Hunt
8. Footer

`Collector Selection` remains the largest commerce surface.

### Shared authority

Loot Vault is presentation and discovery composition only. It does not become product, scarcity, release, inventory or checkout authority.

- **E1 Runtime** — Page Schema/runtime/component registry/responsive authority.
- **E2 Product Discovery** — catalog/search/channel/product eligibility authority.
- **E7 Structured Product** — rarity, edition, format, provenance/release-related facts only when supplied by authoritative structured product data.
- **E10 Editorial / Story** — Vault Feature, collector guide and journal presentation.
- **E13 Checkout** — provider-neutral cart/checkout and final commerce authority.

Global authority rule remains:

`collector-presentation-never-invents-scarcity-rarity-exclusivity-numbering-preorder-release-price-stock-or-order-authority`

The template must not fabricate:

- scarcity;
- countdowns;
- stock;
- rarity;
- exclusivity;
- numbered-edition state;
- preorder or release dates/status;
- reviews;
- price or compare-at price;
- variant availability;
- checkout/payment outcomes.

Loot-box, odds and gambling mechanics remain explicitly excluded.

## Builder contract

Wave 39 preserves:

`Template → Page Presets → Section Presets → Components`

Required Builder properties:

- stable node IDs;
- stable allowlisted content bindings;
- shared design tokens;
- shared responsive grid;
- Desktop / Tablet / Mobile configuration;
- 14 Alap-compatible presets;
- draft-only installation;
- future Visual Builder compatibility without introducing drag/drop UI, live canvas, inline editing or a template-local Builder engine.

The runtime binding/component allowlists are not widened by this wave.

## First current-baseline gate — failed as designed

Initial Wave 39 acceptance commit:

`016d48e788ca406300837543b656ee4bfc329983`

CI:

- run number: `2411`;
- Actions run: `34519509935`;
- result: **FAIL at Quality tests**;
- security audit: PASS;
- customer database baseline guard: PASS;
- Fresh Install: intentionally SKIPPED because there is no migration.

The uploaded failed quality artifact was actually downloaded and inspected:

- artifact: `quality-test-results`;
- artifact id: `10169066684`;
- digest: `sha256:023fdfafd87cd97676620593814699a59f89424ae41eb81ef53075f349da5e8e`;
- test files: 227;
- suites: 454 passed / 2 failed / 456 total;
- tests: 1636 passed / 2 failed / 1638 total;
- pending: 0;
- todo: 0.

The failure had two causes that were deliberately separated rather than bypassed:

1. `story.hero`, `story.feature` and `story.index` appeared as `COMPONENT_NOT_REGISTERED` because the first new gate incorrectly used the Configurator registry for a canonical E10/Story template. Repository history and the original Wave 20 regression test prove that Loot Vault's shared `story.*` surfaces belong to the shared Story registry. The gate harness was corrected to use `createStorefrontStoryComponentRegistry()`; no shared registry or allowlist was weakened.
2. The Catalog page contained a genuine inherited `NODE_ID_DUPLICATE`: `header('loot-catalog')` generated node id `loot-catalog-header`, while the adjacent catalog section also used `loot-catalog-header`. This was a real template-side architecture defect.

## Template-side hardening correction

The genuine inherited defect was fixed in `src/lib/builder/templates/loot-vault.ts` by renaming only the conflicting catalog section identity:

`loot-catalog-header`
→ `loot-catalog-collection-section`

This preserves component choice, data bindings, layout, presentation and business authority while restoring page-local stable node uniqueness.

No shared Storefront Runtime, component registry, binding allowlist, Page Schema authority, commerce engine or entitlement contract was modified to make the gate pass.

## Accepted implementation HEAD

Accepted corrected implementation HEAD:

`69475c0e14dc8111857234d33d0e1d0eb6e5a649`

Implementation CI:

- run number: **2419**;
- Actions run: **`34520078380`**;
- result: **SUCCESS**;
- security audit: PASS;
- customer database baseline guard: PASS;
- Quality tests: PASS;
- TypeScript: PASS;
- production build evidence: PASS;
- release manifest generation/upload: PASS;
- Fresh Install: intentionally SKIPPED; no SQL/migration exists in Wave 39.

### Implementation quality artifact

Actually downloaded and inspected:

- artifact: `quality-test-results`;
- id: **`10169277264`**;
- digest: **`sha256:a1d7311dd2589542a963cc0a0a801de00ed651c0ead388f57e5808228154599f`**;
- 227 unique test files;
- **456 / 456 suites PASS**;
- **1638 / 1638 tests PASS**;
- failed: 0;
- pending: 0;
- todo: 0;
- Wave 39 acceptance: **10 / 10 PASS**.

The ten Wave 39 tests cover canonical identity/sequence, portfolio DNA and Home order, shared engine authority, anti-gambling/scarcity invariants, binding namespace safety, stable node identity and current runtime validation for all 14 presets, responsive PDP/shared commerce bindings, draft-only installation/demo safety, provider-neutral E13 checkout, and Builder-ready/no-template-local-engine constraints.

### Implementation release manifest

Actually downloaded and inspected:

- artifact: `release-manifest`;
- id: **`10169313290`**;
- digest: **`sha256:73f1c40f51a76e203988c9ee0405a72f092706edca6bac2b829ee52ce605e2fb`**;
- manifest version: `v24`;
- manifest SHA: `69475c0e14dc8111857234d33d0e1d0eb6e5a649`;
- ref: `feature/storefront-loot-vault-wave39`;
- environment: `ci`;
- release hash: **`adb2ec46e80a91d3205ed4f39ae4e3ff0020ae1b813f10440e0147eb02805375`**.

## Implementation diff boundary

Exact compare from accepted Wave 38 final HEAD `d884d80686ccb6793eb74a486488d631b797bd01` to accepted Wave 39 implementation HEAD `69475c0e14dc8111857234d33d0e1d0eb6e5a649`:

- 2 commits ahead;
- 0 behind;
- 3 changed files;
- `src/lib/builder/templates/loot-vault-wave39-acceptance.ts` — added;
- `tests/storefront-loot-vault-wave39-reacceptance.test.ts` — added as a real Vitest-included `.test.ts` acceptance gate;
- `src/lib/builder/templates/loot-vault.ts` — only the catalog node-id hardening change (`+2 / -2`).

No SQL/migration, shared runtime, shared component registry, shared engine, payment integration or customer-baseline file is changed.

## Deployment and data boundary

Wave 39 remains a storefront stack/preview-only development wave.

It does not authorize:

- merge to `main`;
- Vercel production deployment;
- Supabase migration or data mutation;
- Water-K tenant status change;
- payment/K&H/vPOS changes.

The Water-K tenant must remain `pilot / pro` throughout closure.

## Final closure gate

This documentation/evidence commit is permitted only because implementation HEAD `69475c0e14dc8111857234d33d0e1d0eb6e5a649` passed full CI and both implementation artifacts were actually downloaded and inspected.

Wave 39 is fully closed only after this documentation HEAD itself passes a fresh full CI, its quality and release-manifest artifacts are again actually downloaded and inspected, exact Wave38→Wave39 final diff remains within scope, a stacked Draft PR is created against `feature/storefront-playroom-wave38` and is server-side mergeable, the Wave 39 Vercel preview is READY without production rollout, Supabase remains unchanged/healthy, and Water-K remains `pilot / pro`.

Wave 40 must not start before those final conditions are satisfied.
