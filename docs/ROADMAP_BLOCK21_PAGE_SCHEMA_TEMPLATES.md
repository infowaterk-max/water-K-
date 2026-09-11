# Roadmap Block 21 — Page Schema / Templates

Status: implementation in progress

## Canonical purpose

Block 21 promotes the already-proven Storefront Runtime / Template scale-out foundation into the canonical, versioned Page Schema and template contract that every Shoporation storefront template uses. It does not introduce a second storefront runtime, a second publish authority, or a Visual Builder interaction layer.

The canonical hierarchy is:

`Template -> Page Presets -> Section Presets -> Components`

Every template remains data/configuration over the same shared runtime, responsive grid, component registry, binding layer, design-token system, persistence authority and entitlement authority.

## In scope

- A canonical versioned Page Schema contract for all supported storefront page types.
- A canonical 42-template catalog/registry with category classification and Basic/Pro entitlement metadata.
- Shared page preset and section preset contracts suitable for later Visual Builder consumption.
- Common 12-column responsive grid, desktop/tablet/mobile breakpoint inheritance, layout presets and semantic design tokens as mandatory template invariants.
- Typed layered hero/banner content contracts using shared components rather than template-specific runtime code.
- Explicit template/page coverage metadata for home, catalog, product, cart, checkout, account, search, content, blog index/article, FAQ, contact, legal and not-found pages.
- Builder-facing editability metadata only: stable IDs, editable fields, allowed component/section capabilities and responsive configuration metadata.
- Responsive preview/runtime contracts that resolve through the same schema/runtime authority as published storefront rendering.
- Template install/switch/upgrade/refresh contracts that continue to materialize canonical storefront drafts.
- Existing revision, publish, preview-token and rollback semantics as the only page lifecycle authority.
- Tenant isolation, RBAC, entitlement, optimistic concurrency/idempotency, audit/evidence and fail-closed validation.
- Contract and regression tests proving exact catalog cardinality, common-engine invariants, entitlement boundaries and absence of Visual Builder behavior.

## Existing authorities retained

Block 21 deliberately reuses and does not fork these existing authorities:

- `shoporation.storefront-builder-foundation.v1` for Page Schema vocabulary, responsive grid, design tokens and future-builder compatibility flags.
- Storefront component/template registries and schema migration pipeline.
- Storefront template installation planning/materialization.
- Storefront persistence RPCs for draft save, publish, rollback and preview sessions.
- Block 11 entitlement/capability authority.
- Existing tenant-derived identity, RBAC and audit boundaries.

No client-supplied tenant identifier becomes an authority. No generic SQL/RPC proxy is introduced. Block 17 workflow/event/retry/dead-letter authority and Block 20 extension delegation boundaries remain unchanged.

## Block 22 boundary — explicit non-scope

Block 21 MUST NOT implement:

- drag-and-drop editing;
- a visual canvas;
- inspector/property panels;
- resize handles;
- interactive block dragging/reordering;
- a merchant-facing builder interaction engine;
- an admin editor that is functionally the Visual Builder.

Schema metadata required for the later builder is allowed, but `inlineEditingRuntime` and `dragDropRuntime` remain disabled.

## Data and release boundary

The existing storefront persistence schema already owns page revisions, preview sessions, events and publish/rollback authority. Block 21 must not add a duplicate database lifecycle or business-state authority merely to represent schema metadata that belongs in versioned code contracts.

A database/customer-baseline migration is only justified if implementation reveals a missing persistence invariant that cannot be expressed through the existing canonical authority. If the customer baseline remains unchanged, the existing successful `0001-0017` Fresh Install proof remains the proof for that unchanged baseline and must not be recycled as proof for a modified baseline.

No Block 21 release step may install, activate or publish a template/page revision for the Water-K tenant as a side effect.

## Acceptance invariants

Block 21 is releasable only when all of the following hold:

1. The canonical catalog contains exactly 42 template definitions.
2. Every template points to the same common runtime/grid/token authority; no template-specific runtime engine exists.
3. Every template declares category, minimum plan, page presets and supported page types deterministically.
4. Basic/Pro gating fails closed through the existing capability/entitlement authority.
5. Preview and published rendering consume the same versioned page-schema semantics while retaining separate preview/published lifecycle authority.
6. Install/switch/upgrade/refresh remain draft-only until the existing publish authority is invoked.
7. Unknown forward-compatible config remains preserved by the existing schema migration policy.
8. Visual Builder interaction flags remain disabled and no Block 22 UI is introduced.
9. Tenant isolation, RBAC, idempotency/optimistic concurrency and audit/evidence regressions are green.
10. Water-K storefront/business invariants remain unchanged before and after release.
