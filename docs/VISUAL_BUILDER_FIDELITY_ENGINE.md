# Visual Builder Fidelity Engine

Status: **Beauty Lab canary engineering hardening complete on stacked Draft PR; Product Owner visual acceptance still required**

Branch: `feature/visual-builder-fidelity-engine`
Base: `feature/visual-fidelity-recovery-beauty-lab`

## Objective

Raise Shoperation Visual Builder from a safe block editor into a reusable high-fidelity storefront composition system without sacrificing editability, responsive safety, commerce authority, accessibility, template portability or storefront performance.

Beauty Lab is the canary. The solution must remain one shared Page Schema / Component Registry / Storefront Runtime / Visual Builder system; no Beauty-Lab-only renderer or parallel runtime is allowed.

## Implemented shared capabilities

- Normal / Advanced / Expert edit-mode contract and Builder controls;
- responsive section ordering and responsive child ordering with breakpoint inheritance;
- component style-slot sanitization/resolution and Builder operations;
- responsive typography, authored line breaks and bounded text geometry;
- responsive image art direction, crop/focal and aspect-ratio controls;
- bounded section-local layered composition and layer geometry;
- composition presets, reset operations and Design Guard drift diagnostics;
- shared motion contract with reduced-motion support;
- shared Storefront Performance Contract and structural budgets;
- shared trust-strip primitive;
- shared functional quantity + cart + wishlist purchase controls using canonical commerce authority;
- shared fail-closed editorial before/after primitive that never fabricates evidence;
- exact-head Home/PDP Desktop / Tablet / Mobile visual-fidelity workflow;
- exact-head runtime performance evidence integrated into the visual acceptance loop.

## Canonical Beauty Lab composition

The recovered Beauty Lab source is now `beauty-lab-reference-v28.ts`, consumed by canonical template v2.

The final v2.8 composition is flattened directly from the retained v2.4 shared reference source. Intermediate v2.5 / v2.6 / v2.7 recovery wrapper layers were temporary implementation history and are not part of the final runtime code path.

Canonical runtime behavior includes:

- compact reference-led Home hero, Finder, Ingredient Index, Texture Lab and featured-product rhythm;
- responsive mobile Bestseller-first section ordering through Fidelity Engine metadata;
- shared Home and PDP trust strips;
- PDP flow: gallery/buybox -> trust -> tabs -> specifications/details -> related products -> result/evidence area;
- canonical `commerce.purchase-controls@1` with identity/stock fail-closed preview behavior;
- merchant-evidence-only `editorial.before-after@1`;
- below-fold Home section deferral through shared `layout.section` performance configuration.

No second template identity or template-local application engine was introduced.

## Performance acceptance

Visual fidelity cannot weaken storefront speed requirements.

Runtime acceptance uses stable Desktop / Tablet / Mobile device-class viewports and clean navigation pages before any screenshot-specific DOM traversal, image waiting or animation override work.

For each page/breakpoint case:

1. take three independent clean-navigation samples;
2. keep the canonical thresholds unchanged;
3. use the median as the blocking value;
4. record every individual threshold excursion in the artifact manifest for diagnosis;
5. keep screenshot capture isolated from performance measurement.

This prevents a single CI scheduler spike from becoming a false release failure while still rejecting persistent regressions. INP is not claimed until a standardized non-mutating storefront interaction probe exists.

See `docs/STOREFRONT_TEMPLATE_PERFORMANCE_CONTRACT.md` and `scripts/capture-visual-fidelity.mjs`.

## Visual acceptance authority

Engineering gates prove that the Runtime builds, validates, renders across breakpoints, stays within measured performance gates and produces reviewable artifacts.

They do **not** grant final visual acceptance.

Beauty Lab remains blocked from final visual PASS until the Product Owner compares the actual Runtime Home + PDP Desktop / Tablet / Mobile output against the exact approved reference and explicitly approves it. Automated screenshot capture/diff is only supporting evidence.

Until that approval:

- PR remains Draft;
- no merge to `main`;
- no production deploy;
- no production Supabase mutation;
- do not propagate the fidelity repair across the remaining template portfolio.

## Non-negotiable architecture guardrails

- one canonical Page Schema;
- one Component Registry;
- one Renderer Registry / Storefront Runtime authority;
- one Visual Builder authority;
- no template-specific runtime branching;
- no screenshot-baked UI;
- no hidden duplicate DOM for breakpoint tricks;
- no arbitrary HTML/CSS/JS injection;
- no fixed-position page-layout escape;
- visual edits cannot mutate product, price, inventory, customer, order or payment authority;
- Builder/editor complexity must not leak into published storefront runtime cost.

## Next gate

The next product decision is **not another generic Builder expansion**. It is Product Owner Beauty Lab Home + PDP Desktop / Tablet / Mobile comparison against the exact approved reference. Any remaining evidence-backed gap should be closed through reusable Fidelity Engine capabilities rather than Beauty-Lab-only hardcode.