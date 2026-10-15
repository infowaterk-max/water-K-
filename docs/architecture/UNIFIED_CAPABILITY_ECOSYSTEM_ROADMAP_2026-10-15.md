# Shoperation — Unified Capability Ecosystem: staged roadmap placement

**Recorded:** 2026-10-15 · **Status:** accepted Product Owner direction / roadmap scope, **not** technical implementation or verification proof.

## Purpose and authority

The platform has three connected product pillars:

1. **Shoperation Core:** canonical business/runtime capabilities, data/tenant/actor/plan rules, dependencies, merchant-operable admin/menu/route placement and functional contracts.
2. **VX Shop Builder:** shared Page Schema/Storefront Runtime composition, visual editing, responsive behavior, saved/published revisions and guarded commerce bindings; it never owns Core business truth.
3. **Template Portfolio:** initially **42 distinct launch design families**, not a permanent numerical ceiling; each family has 14 canonical pages and Desktop/Tablet/Mobile references. Later templates and add-ons join the same capability ecosystem, not a new silo.

This is **not** a new architecture constitution, fourth product pillar, runtime orchestrator, standalone Control Plane, second capability graph, or competing acceptance authority. Existing Architecture Constitution, Domain Foundations, Capability Registry, Living Roadmap v2, Atlas/Authority Graph, PO Instruction Authority, Sentinel, Failure Intake, Incremental Replay, Template Factory Quality Gate and Completion Truth retain their owners and authority boundaries.

Contracts must be typed/versioned and traceable across canonical owner, capability, consumer, admin/merchant route, actor/tenant/plan entitlement, source/runtime contract, change-impact relationships, positive/negative evidence and exact state/version. The graph supports both downstream dependency traversal and upstream impact analysis. Monitoring and development-gate outages must not unnecessarily interrupt healthy merchant commerce; critical checkout, entitlement, tenant and security checks stay fail-closed at their own runtime boundaries. Sentinel detects and recommends; it does not obtain unapproved destructive/production mutation authority.

## Stage placement — do not reorder maturity gates

| Existing roadmap milestone | Ecosystem responsibility |
| --- | --- |
| **Current Core development** → `SHOPERATION-CORE-CAPABILITY-COMPLETE` | **Stage A:** close Core-owned capability/route/entitlement/ownership/dependency/proof contracts using existing registries and guards. No Builder or Factory production detour. |
| `CORE-OPERATIONAL-ADVERSARIAL-PROOF` | Verify Stage A edge coverage, drift, missing links, dependency cycles, negative security paths and runtime independence from noncritical monitoring. |
| `UNIFIED-SHOPERATION-PRODUCT-EXPERIENCE` | Unify the merchant-operable admin and canonical menu/route/interaction authority used by Builder-facing design contracts. |
| `TEMPLATE-CAPABILITY-CENSUS-42` | Map 42 families × 14 pages × 3 viewports from PO-approved visual requirements to typed Builder primitives and Core bindings **without implementing the templates**. |
| `VISUAL-BUILDER` → `BUILDER-PRODUCTION-COMPLETE` → `BUILDER-ADVERSARIAL-ACCEPTANCE` | **Stage B:** close shared Builder capabilities and usable editor behavior, then adversarially prove edit → save → reopen → preview → publish/rollback → rendered storefront. No hardcoded screenshot or template-local renderer rescue. |
| `TEMPLATE-PRODUCTION-SYSTEM` | **Stage C:** revalidate the existing Generator Readiness, Factory contracts, three-dimensional proof (visual, function, editor/managed editability) and graph-aware change replay above the completed Builder. |
| `TEMPLATE-PORTFOLIO-42` | Produce **42 launch templates**, with approved Visual First, complete 14×3 proof, real commerce/managed/editability journeys and separate human PO visual acceptance; additional families later use the same pipeline. |

The essential bounded Section/Block/Preset authoring foundation precedes **Builder Production Complete**. Optional broad preset-gallery enrichment derived from accepted portfolio designs follows portfolio acceptance. This avoids a circular prerequisite and preserves both earlier intentions.

## Product Owner acceptance and shared evidence

- **Visual First before template coding:** approve references for the full 14 pages and three viewports, then perform Builder capability readiness, template-specific implementation, QA and final human visual approval. An initial representative-page implementation is a production technique **after** reference approval, never a substitute for 14×3 reference acceptance.
- The visual, functional and Builder/managed-editability proof dimensions are **jointly mandatory**, alongside existing security, accessibility, performance, tenant/entitlement and exact-head evidence. A green CI, visual similarity metric or screenshot alone cannot substitute for PO approval.
- If a visual requirement cannot be expressed with the approved shared Builder, repair and prove the **shared Builder capability** first. Do not downgrade the accepted reference, hide layout defects with template-local CSS/DOM, or create another commerce/renderer/controller. Reference change requires renewed explicit PO approval.
- The PO handoff/dashboard is a **read-only aggregation** of existing producer evidence and genuine PO decisions; it is not a new independent pass/fail owner. Known Failure learning returns to the existing shared authority and regression controls.
- Incremental Replay may reuse proof only when applicable semantic dependencies, versions, branch/evidence lineage and context are proven compatible; unknown/stale means scoped rerun or conservative full verification. An upstream shared change invalidates affected dependent proof, not a valid historical PO decision.

## Development continuation / handoff

When the Product Owner writes a generic **“folytassuk” / “rendben, folytassuk”** in a Shoperation development thread, first inspect the **current** main HEAD, active PR/workflow state, latest CI/Completion Truth/Lifecycle, the currently active Core work/blocker and Living Roadmap v2 dependencies. Continue the **existing active, eligible workstream** unless the PO explicitly changes scope. Do not jump to Stage B Builder, Stage C Factory or template production while Core capability closure/adversarial audit or their upstream dependencies remain unverified. The roadmap placement is a future obligation, **not** evidence that this new architecture was already implemented.

Any future implementation follows the existing AGENTS.md development guards, risk-based plans, exact-head proof and release governance. This document explains accepted staged scope; it does not independently authorize merges, deployment, migrations, new paid integrations or autonomous runtime modification.
