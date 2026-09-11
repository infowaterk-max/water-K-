# Storefront Scale-out Wave 38 — Playroom Re-acceptance & Builder Hardening

## Canonical identity

Wave 38 is the current-baseline re-acceptance of the repository's original **Wave 19 — Playroom**.

- canonical template key: `gaming.playroom`
- category: Gaming & Geek #7
- template version: 1
- minimum plan: `alap`
- demo namespace: `gaming-playroom`
- shared engine contract: `E1 + E2 + E3 + E6 + E7 + E10 + E13`
- historical predecessor: Wave 18 Spec Lab (`tech.spec-lab`)
- current stacked predecessor: Wave 37 Spec Lab (`feature/storefront-spec-lab-wave37`)

This identity was reconstructed from the original `docs/STOREFRONT_PLAYROOM_WAVE19.md`, the canonical installable Playroom package, the historical Wave 19 PR/stack, and the following Wave 20 Loot Vault stack. It was not inferred from wave numbering alone.

Playroom remains the broad gaming / console discovery storefront. It does not absorb Rig Forge's PC configurator responsibility or Loot Vault's collector/drop identity.

## Stack boundary

Wave 38 branch:

`feature/storefront-playroom-wave38`

Exact accepted Wave 37 base:

`a18e4b50583cc22bd7a9dde581afa7a7d0726870`

Required Draft PR base:

`feature/storefront-spec-lab-wave37`

Implementation/re-acceptance head:

`0b277d7ccc4b0186cf07537ef800bf6815265521`

At the implementation head the exact Wave37→Wave38 compare is 5 commits ahead, 0 behind and changes only:

- `src/lib/builder/templates/playroom.ts`
- `src/lib/builder/templates/playroom-wave38-acceptance.ts`
- `tests/storefront-playroom-wave38-reacceptance.test.ts`

No SQL or migration is introduced.

## Historical scope preserved

The canonical Playroom discovery path remains:

`Válassz platformot → Nézd meg az újdonságokat → Találd meg a játékot → Játssz együtt → Egészítsd ki`

The canonical Home composition remains:

1. Playroom Hero
2. Shop by Platform
3. New & Noteworthy
4. Game Finder
5. Play Together
6. Genre Rooms
7. Accessories by Platform
8. Platform Match
9. Editor's Picks
10. Guides & Reviews
11. Footer

The package remains a 14-page Alap preset family: Home, Catalog, Product, Search, Cart, Checkout, Account, Content, Blog Index, Blog Article, FAQ, Contact, Legal and Not Found.

## Builder / authority contract

Wave 38 preserves the hierarchy:

`Template → Page Presets → Section Presets → Components`

The template uses stable node IDs, stable shared binding paths, shared design tokens, shared responsive layout rules and Desktop / Tablet / Mobile metadata. It remains future Visual Builder compatible without introducing drag & drop, live canvas, inline editing or a template-local Builder engine.

The template is presentation/configuration only. It is not authority for price, compare-at price, stock, availability, variants, review truth, product eligibility, structured product truth, checkout outcome or payment state.

Shared authority remains:

- E2: catalog/search/channel/product eligibility
- E3: guided Game Finder over E2-eligible products
- E6: explainable compatibility evidence; unknown is not compatible
- E7: structured platform/genre/player/product facts
- E10: editorial read model/content authority
- E13: provider-neutral cart/checkout/final validation

No K&H vPOS logic, merchant secret, callback/process/status handling or payment-state authority exists in the Playroom template.

## First acceptance gate — real contract failures

The first Wave 38 acceptance run intentionally exercised the inherited Playroom package against the current shared runtime rather than weakening the runtime contract.

Failed CI:

- Actions run number: `2388`
- Actions run id: `34515544282`
- head: `ed0b6f1ff902133d5987baedf121e8647cb3c3dd`
- result: `FAILURE` at Quality tests
- security audit: PASS
- customer database baseline guard: PASS

Downloaded quality artifact:

- artifact id: `10167547212`
- digest: `sha256:e6bbada6a5b7be8077aa6babb64eaaab66df619b5bc4e79660f03e71c5f793e2`
- suites: 452 / 454 PASS
- tests: 1625 / 1627 PASS
- failed tests: 2

The artifact exposed five inherited contract violations:

1. Home used `compatibility.evidence` on an unsupported page type.
2. Catalog collection-header node ID collided with the protected header node identity.
3. Catalog navigation-section node ID collided with the protected navigation node identity.
4. Product used `compatibility.status` on an unsupported page type.
5. Content used `editorial.journal-preview` although that shared component is not allowed on Content pages.

The gate was not bypassed, removed or weakened.

## Template-side hardening corrections

Wave 38 fixes the template to the existing shared contracts:

- Home Platform Match keeps the supported shared `compatibility.status` surface and removes the unsupported Home evidence component.
- Product compatibility keeps the supported shared `compatibility.evidence` surface and removes the unsupported Product status component.
- Catalog collection-header node identity is made unique.
- Catalog guidance section node identity is made unique.
- Content Guides uses the existing Content-compatible shared `editorial.split-feature` surface while keeping E10-backed content bindings.

No component page-type allowlist or shared runtime contract was widened.

## Accepted implementation evidence

Successful implementation CI:

- Actions run number: `2394`
- Actions run id: `34516169213`
- exact head: `0b277d7ccc4b0186cf07537ef800bf6815265521`
- conclusion: `SUCCESS`
- security audit: PASS
- customer database baseline guard: PASS
- Quality tests: PASS
- TypeScript check: PASS
- production build compilation: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because this wave introduces no database baseline migration

Downloaded and inspected quality artifact:

- artifact id: `10167781921`
- digest: `sha256:1606e28636298c5d4e6c47dc9691b7281c03643266d3d9b87424807b699d783d`
- unique test files: 226
- suites: 454 / 454 PASS
- tests: 1627 / 1627 PASS
- failed: 0
- pending: 0
- todo: 0
- Wave 38 re-acceptance gate: 10 / 10 PASS

Downloaded and inspected release-manifest artifact:

- artifact id: `10167833927`
- digest: `sha256:a03c74c96119c5ec3bb824ba8acf40bb7050479d6b4a4280badd594fa964c0ac`
- manifest SHA: `0b277d7ccc4b0186cf07537ef800bf6815265521`
- manifest ref: `feature/storefront-playroom-wave38`
- environment: `ci`
- release hash: `b043591894b264897b8f89e57d444c118dd2c4a4f07e34043d75ca4faa26a9e4`

## Deployment and data boundary

Implementation preview:

- Vercel deployment: `dpl_6ew4QDZxfueXgyMFShbkGMfCdts9`
- state: `READY`
- target: `null`
- SHA: `0b277d7ccc4b0186cf07537ef800bf6815265521`

This preview is not a production rollout.

At implementation evidence time:

- production Vercel remained a separate `main` deployment;
- Supabase project `waterk-platform` / `ewdederyvnwmghlydbno` remained `ACTIVE_HEALTHY`;
- Water-K remained `pilot / pro`;
- no Supabase mutation was performed by Wave 38;
- no merge to `main` was performed.

## Final closure rule

This documentation commit is the docs/evidence head. It must receive a new full CI, and its quality artifact and release manifest must again be downloaded and inspected before Wave 38 is considered closed.

Only after that final evidence may the stacked Draft PR be opened against `feature/storefront-spec-lab-wave37` and server-side mergeability / final Vercel preview / production boundary / Supabase / Water-K invariants be rechecked.

Wave 39 must not start as part of this closure.
