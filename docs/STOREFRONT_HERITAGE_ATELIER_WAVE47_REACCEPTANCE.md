# Storefront Scale-out Wave 47 — Heritage Atelier Re-acceptance & Builder Hardening

## Canonical scope evidence

Wave 47 is the current-baseline counterpart of historical **Wave 28 / PR #151 — Heritage Atelier Re-acceptance**. Historical evidence places `jewelry.heritage-atelier` v1 directly after Modern Luxe and before Statement Lab. Wave 47 therefore re-accepts the inherited Golden #3 implementation; it does not create a second Heritage template.

Stack boundary:

- base branch: `feature/storefront-modern-luxe-wave46`
- base SHA: `d4acaa2a8d15445e042e0a2ea12ba4099daf61f0`
- Wave 47 branch: `feature/storefront-heritage-atelier-wave47`
- production `main` remains an independent line and is not rebased into this storefront stack.

## Locked template contract

- template key/version: `jewelry.heritage-atelier` v1
- identity: heritage craftsmanship + provenance + editorial commerce
- Home order: Heritage Hero → Featured Collection Story → Craftsmanship Feature → Product Selection → Maker/Atelier Story → Material & Origin → Timeline/Heritage → Editorial Commerce Grid → Journal → Service/Care → Footer
- shared engines: E1 + E2 + E10 + E13; E7 useful when authoritative structured material/product facts exist
- E10 Story Engine stays shared; no Heritage-local Story/provenance engine exists
- provider-neutral checkout remains shared E13
- 14 Alap-compatible Page Schema presets remain responsive on desktop/tablet/mobile
- installation remains draft-only in demo namespace `jewelry-heritage-atelier`
- template switching may mutate storefront page drafts only; it does not own Story documents, products, collections, makers, customers or orders
- no Visual Builder drag/drop, live canvas or inline-editing implementation is pulled into Wave 47

## Fail-closed acceptance gate

First contract-first acceptance HEAD:

`2ebfd1f2d307d01d1e019f0ffc10bfe40d475e3e`

CI run: `34558990552`

Observed result:

- Security: PASS
- Customer baseline guard: PASS
- Fresh Install proof: SKIPPED
- Quality: FAIL
- Quality artifact: `10183637633`
- GitHub SHA-256: `a8db6372e04a47366aa81f2a66fecca5128badec08dbb643c8c3b4b86b9a8b58`
- downloaded ZIP SHA-256: `a8db6372e04a47366aa81f2a66fecca5128badec08dbb643c8c3b4b86b9a8b58`
- result: 472 total suites / 470 passed / 2 failed; 1732 total tests / 1730 passed / 2 failed

Both failures proved one inherited/current-contract drift: historical Heritage Page Schema still used the non-allowed `story.*` binding namespace. The current shared runtime allowlist already permits the common `content.*` and `origin.*` projections but does not permit `story.*`.

The shared allowlist, component registry, binding namespace list and commerce authority contracts were **not** widened.

## Minimal current-contract drift repair

The inherited Heritage template alone was aligned to existing shared binding namespaces:

- editorial Story projections → existing `content.*` namespace
- verified provenance claim projection → existing `origin.verifiedClaims`
- provenance fallback stays empty (`claims: []`)
- no Story, pricing, inventory, variant, checkout, payment, order, rating/review or eligibility authority was added to the template
- no fake provenance, material, maker or scarcity data was introduced

Implementation repair commits:

- `e8f37b815acaadf2bad850b33558fc1f109be360` — align inherited Story bindings with current shared namespaces
- `4caaddf2259b6398af988ecb8e22635c555f1df8` — lock the current binding projection in the acceptance gate

## Green implementation evidence

Green implementation HEAD:

`4caaddf2259b6398af988ecb8e22635c555f1df8`

CI run: `34559354638`

Gate result:

- Security: PASS
- Customer baseline guard: PASS
- Quality: PASS — **472/472 suites, 1732/1732 tests**
- TypeScript: PASS
- Production build: PASS
- Release manifest: PASS
- Fresh Install proof: SKIPPED because Wave 47 adds no migration

Quality artifact:

- artifact ID: `10183754168`
- GitHub SHA-256: `4db8aee33457fc971eea42115e8929a47944c3875a3f65e3a2178dfb49fcd47e`
- downloaded ZIP SHA-256: `4db8aee33457fc971eea42115e8929a47944c3875a3f65e3a2178dfb49fcd47e`

Release Manifest artifact:

- artifact ID: `10183777413`
- GitHub SHA-256: `b304d2e886ee2eeff87cd36c8927a42b4715f2f892b09704b69633ffe234a41e`
- downloaded ZIP SHA-256: `b304d2e886ee2eeff87cd36c8927a42b4715f2f892b09704b69633ffe234a41e`
- release manifest SHA: `4caaddf2259b6398af988ecb8e22635c555f1df8`
- release hash: `85a145fb63cc6fe04829e5ff9e6603866f41c259d67874e51d6774b50554b0ef`

## Database and release boundaries

Wave 47 contains no SQL and no migration. No Supabase production or staging mutation is required or permitted by this scope. The Water-K tenant invariant remains `status=pilot`, `plan=pro`.

Wave 47 must remain a stacked Draft PR with base `feature/storefront-modern-luxe-wave46`; it must not merge to `main` and must not deploy to production.

The final documentation HEAD must pass the complete CI gate again, and the exact final HEAD must have a READY Vercel preview with `target=null` before the Wave is considered closed.