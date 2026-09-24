# Template Factory Visual Assembly v1

## Purpose

This contract turns the accepted Template Factory scaffold into a repeatable production line for the remaining storefront templates.

The target workflow is:

`Category Foundation → Template Recipe → Reference-critical overrides → Media Pack → Demo Content → compiled 14-page package → internal 14×3 QA → internal visual review → Product Owner preview`.

A technical skeleton is never a Product Owner preview.

## Foundation reuse

A category Foundation supplies already-proven platform structure:

- all 14 canonical Page Schema page types;
- shared Runtime and Builder hierarchy;
- responsive authority;
- commerce/account/cart/checkout/search primitives;
- structural accessibility and interaction contracts.

Inherited Foundation pages are copied as implementation input, never treated as target-template visual authority.

## Automatic target dressing

The Factory compiler performs these operations for every compiled page:

1. rewrites stable node identity into the target template namespace;
2. neutralizes declared Foundation brand tokens;
3. neutralizes declared Foundation-owned media prefixes using the target recipe fallback media;
4. stamps the target template key/version and target Global Styles;
5. replaces the outer shell with the target template's canonical header/footer when supplied;
6. applies declared target node patches;
7. records whether the page is Foundation-inherited or template-owned.

This is the code-level equivalent of copying a proven base and dressing it for the current template without maintaining divergent copies of the shared engine.

## Reference-critical surfaces

A visual reference declares the pages that may not remain Foundation-derived. For Loot Vault v2 these are:

- Home;
- Catalog;
- Product;
- Blog index;
- Blog article.

Every reference-critical page must have an explicit template-owned override. A green inherited page is not acceptable evidence for reference fidelity.

## Media authority

A template recipe owns a media manifest with role, aspect ratio, page coverage and representative status.

For Loot Vault v2 the minimum pack is:

- 1 hero / 16:9;
- 6 category / 4:5;
- 4 product / 4:5;
- 2 editorial / 3:2;
- 1 background / 16:9.

The Factory checks both declaration and actual wiring into the declared page types. Placeholder SVG media is forbidden for this reference.

Foundation-owned media may be used only as compiler input and must not survive in the target output.

## Two readiness gates

### Technical ready

The generated candidate may enter internal screenshot/browser QA when every Factory error is resolved except the explicit internal visual-review requirement.

This state is not merchant-facing and not Product Owner-facing.

### Product Owner ready

The candidate becomes eligible for Product Owner preview only after:

- technical Factory checks pass;
- full internal browser/responsive matrix passes;
- representative media is present and working;
- internal screenshots have been reviewed against the accepted visual reference;
- the recipe explicitly records that internal visual review passed.

No catalog registration, installation or production publication is implied by this state.

## Candidate isolation

Factory candidates are rendered by the environment-gated `visual-fidelity-qa` path with `factory=1`.

They are not inserted into `STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES` merely for testing.

The browser quality runner discovers registered Factory recipes through the QA-only template endpoint and runs the same responsive diagnostics against the compiled output.

## Production invariant

The tested package and the eventual accepted package must come from the same recipe/compiler path. Do not create a separate hand-authored Product Owner preview that bypasses the Factory build.

## Media lifecycle: planned → internal-reference → ready

The Factory treats media production as a governed lifecycle rather than a boolean "has image" flag.

- `planned`: the slot and final package path are defined, but there is no visual evidence yet. The candidate must stay out of browser acceptance.
- `internal-reference`: the final package path remains in `src`, while a separate HTTPS `referenceSrc` may be materialized only into the compiled internal QA candidate. This state is sufficient for internal screenshot/composition proof, but is a hard Product Owner blocker.
- `ready`: the final `src` is package-owned and physically present under `public/`. Only this state can contribute to Product Owner/merchant-ready media coverage.

An internal reference source must never replace the final asset destination in the media work-order. Promotion from `internal-reference` to `ready` means producing the declared local asset, removing the temporary reference dependency, and passing the physical-file proof. External reference media is therefore disposable QA evidence, not a shipping dependency.
