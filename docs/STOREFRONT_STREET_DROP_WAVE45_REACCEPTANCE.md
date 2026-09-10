# Storefront Scale-out Wave 45 — Street Drop Re-acceptance & Builder Hardening

## Status

Wave 45 re-accepts the inherited **Street Drop (`fashion.street-drop` v1)** package against the current Storefront Runtime / Builder contract. It is deliberately not a second Street Drop implementation.

Branch: `feature/storefront-street-drop-wave45`

Stack base: `feature/storefront-editorial-atelier-wave44` @ `c46c0c3318980a09978f75c37d45a404500737a6`

No `main` merge, production deployment, Supabase mutation, SQL migration, tenant-status change or tenant-plan change is authorized by this wave.

## Canonical scope evidence

Repository history proves the original sequence:

- PR #146 — Wave 23 Performance Lab
- PR #147 — Wave 24 Monarche
- PR #148 — Wave 25 Editorial Atelier / Atelier Nova
- PR #149 — Wave 26 Street Drop Re-acceptance

PR #149 is a Draft PR from `feature/storefront-street-drop-wave26` onto `feature/storefront-editorial-atelier-wave25`. Its canonical template key is `fashion.street-drop`, version `1`, and it explicitly describes Wave 26 as a current-baseline re-acceptance of an already inherited Street Drop implementation.

Therefore Wave 45 is the current scale-out counterpart of original Wave 26: **Street Drop current-baseline re-acceptance and Builder hardening**, directly after Wave 44 Editorial Atelier.

## Canonical product / visual contract

Street Drop remains the third distinct fashion direction:

1. Monarche — balanced modern premium mainstream fashion.
2. Editorial Atelier — asymmetric, campaign-led editorial fashion.
3. Street Drop — aggressive but readable streetwear / sneaker / drop culture.

Protected visual and Builder characteristics remain:

- black + off-white foundation with merchant-replaceable neon accent;
- characterful but readable display typography for headings, clean sans-serif UI typography;
- high-energy Home, ordered Catalog/PDP, restrained Cart/Checkout;
- Home sequence: Drop Hero → Release Bar → Shop the Drop → Categories → Limited Stock → Street Story → New Arrivals → Community Journal → Drop Alert → Footer;
- independently editable hero layers: badge, headline, copy, primary CTA, secondary CTA, image;
- independently editable Drop Alert layers: eyebrow, headline, copy, CTA;
- Desktop / Tablet / Mobile responsive behavior;
- 14 Alap-compatible Page Schema presets;
- draft-only namespaced installation under `fashion-street-drop`.

## Authority / engine invariants

Required shared engines remain E1 / E2 / E13; current optional integrations remain E7 / E3 / Recommendations.

Street Drop does not own or fabricate price, inventory, stock count, scarcity, release status, rating, product eligibility, checkout, payment or order authority. Checkout remains shared provider-neutral E13. There is no template-local drop scheduler, release engine, scarcity engine or inventory engine.

All binding paths must remain inside the current shared runtime namespaces. No shared runtime allowlist, component registry or binding namespace is widened for this wave.

## Contract-first acceptance gate

Initial acceptance/evidence head: `a43be466076e705676ad3f54adbc2e5d8569577c`

CI run `34532511031` failed at Quality, while security and customer baseline guard passed and Fresh Install was skipped because there was no migration.

Mandatory failed quality artifact:

- artifact id: `10174104703`
- artifact name: `quality-test-results`
- GitHub digest: `sha256:b1e74ff003e2c1351eb28d4022aea1133dd159e7fdd13e665e215c813b5a3988`
- downloaded ZIP SHA-256: `b1e74ff003e2c1351eb28d4022aea1133dd159e7fdd13e665e215c813b5a3988`
- result: digest verified
- result content: 468 suites total, 466 passed, 2 failed; 1708 tests total, 1704 passed, 4 failed.

The artifact proved exactly two inherited/current-contract drifts:

1. `drop.releaseStatus` used a now-disallowed top-level binding namespace. The current shared runtime allowlist includes `inventory`, not `drop`.
2. Catalog had duplicate node identity: the system header and collection header both resolved to `street-drop-catalog-header`.

No shared contract was relaxed. The inherited template was hardened instead:

- release-status binding changed to `inventory.releaseStatus`, preserving authoritative/fail-closed inventory ownership and the existing no-active-release fallback;
- collection header node id changed to `street-drop-catalog-collection-header`, preserving stable unique Builder identity.

## Green implementation gate

Accepted implementation head: `d7d0b27fd02ba9008d7ff209535ee94095b72796`

CI run `34532896689` — **SUCCESS**.

Verified jobs / steps:

- security audit PASS;
- customer database baseline guard PASS;
- Quality PASS;
- TypeScript PASS;
- production build PASS;
- release manifest generation/upload PASS;
- Fresh Install proof SKIPPED — no migration in Wave 45.

Green quality artifact:

- artifact id: `10174230253`
- GitHub digest: `sha256:7a4ec54dc79f7db32a437a86cfce34031e9134c3a050cfd83ed95b2d1b481c37`
- downloaded ZIP SHA-256: `7a4ec54dc79f7db32a437a86cfce34031e9134c3a050cfd83ed95b2d1b481c37`
- digest verified;
- 468 / 468 suites PASS;
- 1708 / 1708 tests PASS;
- 0 failed / 0 pending / 0 todo.

Green release-manifest artifact:

- artifact id: `10174275145`
- GitHub digest: `sha256:17de5518e70c43c6b147e27116ede5c06b2db25983ff0299b0168b781896b541`
- downloaded ZIP SHA-256: `17de5518e70c43c6b147e27116ede5c06b2db25983ff0299b0168b781896b541`
- digest verified;
- manifest version: `v24`;
- manifest SHA: `d7d0b27fd02ba9008d7ff209535ee94095b72796`;
- ref: `feature/storefront-street-drop-wave45`;
- environment: `ci`;
- release hash: `d45b1a92da0b8de5023783a60abdd4f8216cf373b96b8d8018c730f6bd7ab1c5`.

## Implementation diff before final documentation

Compared with Wave 44 final head `c46c0c3318980a09978f75c37d45a404500737a6`, implementation head `d7d0b27fd02ba9008d7ff209535ee94095b72796` is:

- 4 commits ahead;
- 0 behind;
- 3 changed files;
- acceptance contract added;
- Wave 45 re-acceptance test added;
- inherited `street-drop.ts` changed by exactly two lines added / two lines removed for the two proven drifts.

No SQL, migration, customer-baseline manifest, payment, order, checkout authority, deployment configuration, shared runtime allowlist, shared component registry or shared binding namespace file is changed.

## Baseline / Fresh Install boundary

The stacked Wave 44 → Wave 45 customer-baseline manifest remains `status: ready` with `freshInstallProofRequired: false`; its historical genuine empty-target proof remains recorded in run `34346892406`.

The independently moving production `main` line may have a different customer-baseline proof state because unrelated roadmap work is not rebased into this storefront stack. Wave 45 does not alter that state and does not mutate the dedicated Fresh Install environment.

## Deployment and tenant safety

Wave 45 uses only branch preview deployments (`target=null`). It does not authorize a Vercel production deployment.

Production and staging Supabase are read-only for this wave. Water-K must remain:

- status: `pilot`;
- plan: `pro`.

Any unrelated concurrent `main` / production deployments are outside Wave 45 and must not be folded into, rebased into or attributed to this stacked branch.

## Final closure gate

This documentation commit is the final Wave 45 head only after its exact SHA receives a complete green CI, its final quality and release-manifest artifacts are downloaded and verified, the matching Vercel preview is READY with `target=null`, and the stacked Draft PR is confirmed open/draft/mergeable against `feature/storefront-editorial-atelier-wave44` with an exact 0-behind diff.

Wave 46 is explicitly out of scope.
