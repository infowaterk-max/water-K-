# Storefront Template Performance Contract

Status: mandatory architecture contract for the Visual Builder Fidelity Engine and every Storefront template.

## Product rule

High visual fidelity must never be purchased with a slow storefront. A template is acceptable only when it is visually faithful, safely editable and measurably fast on Desktop, Tablet and Mobile.

The Builder may become substantially more capable, but the published storefront must stay structurally lean. Builder/editor complexity is not allowed to leak into customer-facing runtime cost.

## Non-negotiable runtime principles

1. **Templates are data, not template-local application code.** Layout, style slots, responsive order, art direction and composition remain Page Schema data consumed by the shared Runtime. No template-specific JavaScript engine is introduced for visual fidelity.
2. **No duplicate hidden DOM for breakpoint tricks.** Responsive order and visibility are resolved before rendering. We do not render multiple copies of the same expensive subtree and hide variants with CSS.
3. **Above-the-fold media is explicitly budgeted.** Only probable LCP media may be eager. Everything below the fold is lazy by default. Responsive art direction must serve the correct crop/asset instead of downloading unnecessary desktop media on mobile.
4. **Image cost is part of template quality.** Production media delivery must support responsive sizes, modern formats, correct intrinsic dimensions, focal/crop metadata and CDN/cache-friendly URLs. Decorative images must not block interaction.
5. **Animation is compositing-first.** Prefer transform and opacity. Avoid layout-thrashing animation of width/height/top/left where an equivalent composited effect is possible. Respect `prefers-reduced-motion`.
6. **No unbounded visual-layer growth.** Layered editorial sections remain section-bound and subject to structural budgets. A visually complex hero cannot become hundreds of positioned nodes.
7. **Typography must not cause layout instability.** Font loading requires stable fallbacks/metrics and should not introduce avoidable CLS. Template identity must not depend on a large uncontrolled font bundle.
8. **Published storefronts stay server-first.** Static presentation must not require per-node client state. Hydration/interactivity is limited to components that genuinely need it.
9. **Builder chrome is isolated from storefront runtime.** Selection outlines, guides, inspectors, drag handles, history, Design Guard and Expert controls exist only in the editor and must never ship as customer-facing runtime work.
10. **Third-party scripts are outside template authority.** A visual preset cannot silently add analytics, trackers, widgets or remote executable code.

## Schema complexity budgets

The executable contract lives in `src/lib/builder/storefront-performance-contract.ts`.

Soft budgets produce warnings and Design Guard diagnostics. Hard budgets are release-blocking once the gate is wired into template-package CI.

Current structural budgets per page:

| Metric | Soft | Hard |
| --- | ---: | ---: |
| Top-level sections | 24 | 36 |
| Total component nodes | 160 | 240 |
| Maximum tree depth | 8 | 10 |
| Eager image nodes | 2 | 4 |
| `visual.layer` nodes | 32 | 48 |
| Style declarations | 900 | 1400 |

These limits are safety ceilings, not targets. A normal page should remain comfortably below them.

## Runtime quality targets

The release gate will measure real rendered pages in Desktop/Tablet/Mobile profiles. Initial target thresholds are:

- LCP: <= 2.5 s
- INP: <= 200 ms
- CLS: <= 0.1
- avoid main-thread long tasks above 50 ms during ordinary navigation/edit-independent storefront interaction

The visual-fidelity screenshot gate and the performance gate are independent. Passing one cannot waive the other.

## Template authoring rules

Every template and preset must be optimized for the shared engine:

- reuse primitives and style slots rather than adding one-off wrapper trees;
- keep section nesting shallow;
- do not ship invisible duplicate content to achieve mobile variants;
- limit eager images to actual first-viewport candidates;
- keep product grids lazy below the fold;
- use responsive order instead of DOM duplication;
- use responsive art direction for materially different mobile crops;
- keep hover/motion effects inexpensive and optional;
- avoid huge box-shadows, filters and backdrop-filter over large continuously moving surfaces;
- never add a dependency solely for one template when the same result can be expressed by the shared engine;
- presets may alter visual configuration but may not add runtime scripts or commerce/business logic.

## Builder UX requirements

Performance must be visible to the editor, not only CI.

Planned Builder surfaces:

- live page-complexity indicator;
- soft-budget warnings beside problematic sections;
- eager-image counter and LCP candidate marker;
- media-size/crop diagnostics;
- layer-count warning for complex editorial sections;
- animation-cost warning in Expert mode;
- Design Guard rule: a preset may be visually valid but still fail performance quality;
- one-click jump from a warning to the responsible component.

## Acceptance sequence

A template is releasable only after:

`schema validation -> security validation -> structural performance budget -> build/type/tests -> D/T/M runtime screenshots -> runtime performance measurement -> Product Owner visual PASS`

For the Beauty Lab canary, the Fidelity Engine must first prove that the approved visual direction can be reproduced without exceeding these budgets. Only after that proof should the same capabilities be propagated to the remaining template catalog.
