# Storefront Scale-out Wave 48 — Statement Lab Re-acceptance & Builder Hardening

## Canonical scope evidence

Wave 48 is the current-baseline counterpart of historical **Wave 29 / PR #152 — Statement Lab Re-acceptance**. Historical PR evidence places `jewelry.statement-lab` v1 directly after **Wave 28 / PR #151 — Heritage Atelier Re-acceptance**. The historical Statement Lab implementation is already inherited on the Wave 47 baseline: `src/lib/builder/templates/statement-lab.ts` had blob SHA `40bfbdb2a1eacbfb2a5d0c55699b996ec667e97e` both on historical Wave 29 and on Wave 47 before this hardening.

Wave 48 therefore re-accepts the inherited Statement Lab implementation; it does not create a second template.

Stack boundary:

- base branch: `feature/storefront-heritage-atelier-wave47`
- base SHA: `c11fa8bb0b863f87c3605870d23327e519c45b57`
- Wave 48 branch: `feature/storefront-statement-lab-wave48`
- production `main` remains an independent line and is not rebased into this storefront stack.

## Locked template contract

- template key/version: `jewelry.statement-lab` v1
- identity: contemporary object gallery + material/spec lab
- Home order: Asymmetric Opening → Floating Product Index → Material Study → Statement Grid → Object Detail → Footer
- shared engines: E1 + E2 + E7 + E13
- material/manufacturing/spec/compare truth remains shared E7/product authority; no Statement Lab-local truth engine exists
- provider-neutral checkout remains shared E13
- all 14 Alap-compatible Page Schema presets remain responsive on desktop/tablet/mobile
- installation remains draft-only in demo namespace `jewelry-statement-lab`
- template installation may mutate storefront page drafts only; it does not own products, variants, customers, orders or B2B authority
- material/spec/compare/document surfaces fail closed with empty defaults when authoritative data is absent
- no template-local pricing, inventory, variant, checkout, payment, order, rating/review, eligibility or provenance authority is introduced
- no fake material/manufacturing claim, scarcity, rating or provenance is permitted
- no Visual Builder drag/drop, live canvas, inline editing or template-local layout engine is pulled into Wave 48

## Fail-closed acceptance gate

First contract-first acceptance HEAD:

`0d47b07a90ab9abcef88a4285c9cce77ed08be1b`

CI run: `34563177527`

Observed result:

- Security: PASS
- Customer baseline guard: PASS
- Fresh Install proof: SKIPPED
- Quality: FAIL
- Quality artifact: `10185058064`
- GitHub SHA-256: `726178e76b8d222d825ab404e1711552a56ff4e11a5be50fc963e662265dc444`
- downloaded ZIP SHA-256: `726178e76b8d222d825ab404e1711552a56ff4e11a5be50fc963e662265dc444`
- result: 474 total suites / 472 passed / 2 failed; 1743 total tests / 1741 passed / 2 failed

Both failures proved one inherited/current-contract drift in the Statement Lab catalog Page Schema: the shared system header and the collection header both used the node id `statement-lab-catalog-header`. The current Page Schema validator correctly rejected the duplicate with `NODE_ID_DUPLICATE`.

The shared runtime allowlist, component registry, binding namespaces, capability gates, commerce authority and checkout authority were not widened.

## Minimal current-contract drift repair

Only the inherited Statement Lab catalog collection-header node identity was changed:

- old collection node id: `statement-lab-catalog-header`
- new collection node id: `statement-lab-catalog-collection-header`
- system header identity remains unchanged
- no component key, binding path, pricing/inventory/variant truth, E7 authority, E13 checkout authority or capability contract changed
- no SQL or migration was added

Implementation repair commit:

`30548d731abe99b3e1bb48ab894bc6d23a5e4a99` — remove inherited Statement Lab catalog node id collision

## Green implementation evidence

Green implementation HEAD:

`30548d731abe99b3e1bb48ab894bc6d23a5e4a99`

CI run: `34563374982`

Gate result:

- Security: PASS
- Customer baseline guard: PASS
- Quality: PASS — **474/474 suites, 1743/1743 tests**
- TypeScript: PASS
- Production build: PASS
- Release manifest: PASS
- Fresh Install proof: SKIPPED because Wave 48 adds no migration

Quality artifact:

- artifact ID: `10185121625`
- GitHub SHA-256: `5535a3729177f05008a4ccf0184893e10dfd94ab717553dc06ee1e14be66daf5`
- downloaded ZIP SHA-256: `5535a3729177f05008a4ccf0184893e10dfd94ab717553dc06ee1e14be66daf5`

Release Manifest artifact:

- artifact ID: `10185149132`
- GitHub SHA-256: `9d4be84332c439565e5c8faddaf770046183b8544c240fde9dc7cf334d7a2949`
- downloaded ZIP SHA-256: `9d4be84332c439565e5c8faddaf770046183b8544c240fde9dc7cf334d7a2949`
- release manifest SHA: `30548d731abe99b3e1bb48ab894bc6d23a5e4a99`
- release hash: `2a1eb9159c0e202121c3fd9e4dadedc36137915b89708fa5bc32160f810f2102`

## Customer baseline and database boundary

The storefront stack inherits the Wave 47 customer baseline manifest with `status=ready` and `freshInstallProofRequired=false`. This remains distinct from the independently advanced production `main` baseline, which is `status=snapshot-reviewed` and `freshInstallProofRequired=true` at Wave 48 start. Wave 48 does not rebase the storefront stack to production `main` to erase that distinction.

Wave 48 contains no SQL and no migration. No Supabase production or staging mutation is required or permitted by this scope. The Water-K tenant invariant remains `status=pilot`, `plan=pro`.

Wave 48 must remain a stacked Draft PR with base `feature/storefront-heritage-atelier-wave47`; it must not merge to `main` and must not deploy to production.

The exact final documentation HEAD must pass the complete CI gate again. Final Quality and Release Manifest artifacts must be downloaded and hash-verified again, and the exact final HEAD must have a READY Vercel preview with `target=null` before Wave 48 is considered closed.
