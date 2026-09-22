# Storefront Scale-out Wave 37 — Spec Lab Re-acceptance & Builder Hardening

## Canonical reconstruction

Wave 37 re-accepts the repository's original **Wave 18 — Spec Lab** directly after Creator Station. The historical source of truth is `docs/STOREFRONT_SPEC_LAB_WAVE18.md`, corroborated by the template package/registry identity and the original scale-out sequence.

Canonical identity:

- template: **Spec Lab**
- canonical key: `tech.spec-lab`
- legacy working alias: `Tech Command`
- category: **Electronics & Technology #3**
- historical wave: **18**
- current scale-out wave: **37**
- direct predecessor: `tech.creator-station`
- minimum plan: `alap`
- page preset count: **14**
- demo namespace: `tech-spec-lab`

The accepted historical decision path remains:

`Mit keresel? → Mire használod? → Hasonlítsd össze → Tech Finder → Építsd fel a szetted`

The accepted Home composition remains:

`Mit keresel? → Mire használod? → Hasonlítsd össze → Tech Finder → Építsd fel a szetted → Compatibility Matrix → System Requirements → Accessory Matcher → Trade-in → Tech Magazine → Footer`

## Current shared-engine contract

The historical intent is mapped onto the current repository contracts rather than copying obsolete engine-local implementations:

- E1: shared Page Schema / storefront runtime;
- E2: catalog, search and channel-eligibility authority;
- E3: guided Finder guidance/ranking only;
- E5: slot-based setup/configurator intent and read model;
- E6: explainable compatibility evidence; `unknown` is never treated as compatible;
- E7: structured specification, comparison and system-requirement truth;
- E10: Tech Magazine/editorial read model;
- E13: provider-neutral cart/checkout and final server-side validation.

Spec Lab owns presentation only. It is not authority for price, compare-at price, stock, availability, variants, reviews, product eligibility, structured product truth, compatibility truth, checkout outcome or payment state.

Trade-in remains a read-model/CTA integration hook with no valuation or lifecycle authority. The product 3D entry remains an external viewer-launch hook; no template-owned 3D engine is introduced.

## Builder hardening

The package keeps the shared hierarchy:

`Template → Page Presets → Section Presets → Components`

Wave 37 preserves stable node IDs and binding paths, shared design tokens, shared responsive grid behavior, Desktop/Tablet/Mobile validation and future Visual Builder compatibility. No template-specific Builder runtime, drag-and-drop UI, live canvas or inline editor is introduced.

Historical bindings were aligned to supported current shared surfaces, including `product.systemRequirements`, `content.techMagazineItems`, supported Home compatibility status, and supported PDP compatibility evidence. The shared runtime/page-type allowlists were **not widened** to make the template pass.

## Implementation evidence

Base:

- branch: `feature/storefront-creator-station-wave36`
- Wave 36 accepted SHA: `f6e75853f90c3e0579407e6dfcd72488b5bf50ab`

Implementation HEAD:

- SHA: `18b82813435d7527e6091c981f8d685ad37ec176`
- CI: **#2379**
- Actions run: `34513061831`
- conclusion: **SUCCESS**

Implementation quality artifact:

- artifact id: `10166614751`
- digest: `sha256:3ca3d42b1ea74f00112d1c5042a12755748fdf5f88901f57ccda09d3ed0899d9`
- 225 unique test files
- 452 / 452 suites PASS
- 1616 / 1616 tests PASS
- failed: 0
- pending: 0
- todo: 0
- Wave 37 acceptance: **10 / 10 PASS**

Implementation release-manifest artifact:

- artifact id: `10166663727`
- digest: `sha256:ecd4be15d1e2d06516fee631e13594075cea337fb1ebfc42f180ad75ad2164a4`
- manifest SHA: `18b82813435d7527e6091c981f8d685ad37ec176`
- manifest ref: `feature/storefront-spec-lab-wave37`
- release hash: `b2a26f0278150e7c57487132ae2c7deb8e22632c431c4e1dd20487794d60e173`

The implementation gate previously exposed genuine shared-contract violations rather than being bypassed. The initial failed acceptance at `c3c56d82d2d6302d9592f5493bdbe56f6954dec3` / run `34512022066` produced 1614 / 1616 passing tests and two failures, including `COMPONENT_PAGE_TYPE_NOT_ALLOWED`. The template was corrected to the existing shared component contracts and stable node identity; no shared gate or allowlist was relaxed.

## Scope boundaries

Wave 37 introduces no SQL or migration, no Supabase mutation, no payment-provider change, no K&H vPOS logic, no merchant secret, no callback/process/status handling, no production storefront deployment and no merge to `main`.

The Water-K production tenant remains outside the storefront wave mutation boundary and must remain `pilot / pro`.

This evidence commit intentionally follows a successful implementation CI and artifact inspection. The final docs/evidence HEAD must pass a new full CI, and its quality/release artifacts, exact Wave36→Wave37 diff, stacked Draft PR, server-side mergeability, preview deployment, production boundary, Supabase status and Water-K tenant status must all be verified before Wave 37 is declared closed.
