# Storefront Template Performance Contract

Status: mandatory architecture and release contract for the Visual Builder Fidelity Engine and every Storefront template.

## Product rule

High visual fidelity must never be purchased with a slow storefront. A template is acceptable only when it is visually faithful, safely editable and measurably fast on Desktop, Tablet and Mobile.

The Builder may become substantially more capable, but published storefronts must stay structurally lean. Builder/editor complexity is not allowed to leak into customer-facing runtime cost.

## Non-negotiable runtime principles

1. **Templates are data, not template-local application code.** Layout, style slots, responsive order, art direction and composition remain Page Schema data consumed by the shared Runtime.
2. **No duplicate hidden DOM for breakpoint tricks.** Responsive order and visibility are resolved before rendering; expensive subtrees are not duplicated and hidden with CSS.
3. **Above-the-fold media is explicitly budgeted.** Only probable LCP media may be eager. Below-fold media is lazy by default where the shared component contract supports it.
4. **Image cost is part of template quality.** Production media delivery should use responsive sizes, modern formats, intrinsic dimensions, focal/crop metadata and cache-friendly URLs.
5. **Animation is compositing-first.** Prefer transform/opacity and respect `prefers-reduced-motion`.
6. **No unbounded visual-layer growth.** Layered editorial sections remain section-bound and structurally budgeted.
7. **Typography must not cause avoidable layout instability.** Use stable fallbacks/metrics and controlled font payloads.
8. **Published storefronts stay server-first.** Static presentation must not require per-node client state; hydrate only genuinely interactive components.
9. **Builder chrome is isolated from storefront runtime.** Selection, inspectors, history and Design Guard UI never become customer-facing runtime work.
10. **Third-party scripts are outside template authority.** Visual presets cannot silently add trackers, widgets or remote executable code.

## Schema complexity budgets

The executable structural contract lives in `src/lib/builder/storefront-performance-contract.ts`.

Soft budgets produce warnings/Design Guard diagnostics. Hard budgets are release-blocking.

| Metric | Soft | Hard |
| --- | ---: | ---: |
| Top-level sections | 24 | 36 |
| Total component nodes | 160 | 240 |
| Maximum tree depth | 8 | 10 |
| Eager image nodes | 2 | 4 |
| `visual.layer` nodes | 32 | 48 |
| Style declarations | 900 | 1400 |

These are safety ceilings, not targets.

## Runtime quality targets

Current targets:

- LCP <= 2.5 s
- INP <= 200 ms
- CLS <= 0.1
- avoid main-thread long tasks above 50 ms during ordinary navigation / edit-independent storefront interaction

The visual-fidelity gate and performance gate are independent. Passing one cannot waive the other.

## Exact-head runtime evidence method

The visual acceptance workflow also produces lab runtime-performance evidence. The measurement contract is intentionally isolated from screenshot work.

For every Home/PDP Desktop / Tablet / Mobile case:

1. use a stable device-class performance viewport (`1200x900`, `768x1024`, `390x844`);
2. open **three independent clean navigation pages**;
3. install PerformanceObserver instrumentation before navigation;
4. collect LCP, CLS and maximum long-task duration before screenshot-specific DOM traversal, geometry reads, image waits, animation overrides or reference-frame sizing;
5. read the canonical runtime budget exposed by the QA route and fail if the budget/contract drifts between samples;
6. use the **median of the three supported samples** as the blocking value;
7. retain every raw sample and every individual threshold excursion in the artifact manifest;
8. fail the release gate when the median is over budget or required measured evidence is missing.

The threshold is **not raised** to absorb CI noise. Median sampling distinguishes a persistent regression from an isolated shared-runner scheduling spike while keeping the spike visible for diagnosis.

INP remains explicitly `not measured` in this lab gate until a standardized, non-mutating storefront interaction probe exists. No PASS claim may be made for INP before that probe is implemented.

Canonical implementation: `scripts/capture-visual-fidelity.mjs`.

## Template authoring rules

Every template/preset must be optimized for the shared engine:

- reuse primitives and style slots rather than adding one-off wrapper trees;
- keep section nesting shallow;
- do not ship invisible duplicate content for mobile variants;
- limit eager images to actual first-viewport candidates;
- use responsive ordering instead of DOM duplication;
- use responsive art direction for materially different mobile crops;
- keep motion inexpensive and optional;
- avoid large animated filters/backdrop-filter surfaces;
- never add a dependency solely for one template when the shared engine can express the result;
- presets may alter visual configuration but may not add runtime scripts or commerce/business logic;
- use `layout.section` offscreen deferral only for genuinely below-fold sections, never for the hero/LCP-critical surface.

## Builder UX requirements

Performance should be visible in the editor as the tooling matures:

- page-complexity indicator;
- soft-budget warnings near responsible sections;
- eager-image/LCP candidate diagnostics;
- media-size/crop diagnostics;
- layer-count warnings;
- animation-cost warnings in Expert mode;
- Design Guard performance findings;
- jump-to-component from a performance warning.

## Acceptance sequence

A template is releasable only after:

`schema validation -> security validation -> structural performance budget -> quality/type/build gates -> D/T/M runtime performance evidence -> D/T/M runtime screenshots -> exact approved-reference comparison -> Product Owner visual PASS`

For Beauty Lab, the shared Fidelity Engine must prove the approved visual direction without bypassing these budgets. Only after Product Owner visual PASS should the validated capabilities be propagated to the remaining template catalog.