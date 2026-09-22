# Roadmap Block 22 – Visual Builder

Status: implementation in progress

## Canonical reconstruction

Block 22 is the interactive editing layer over the canonical Block 21 Page Schema / Templates authority. It does not create a second storefront engine, page document, tenant authority, entitlement authority, preview authority or publication state.

The canonical hierarchy remains:

`Template -> Page Presets -> Section Presets -> Components`

The existing Page Schema document is the only document the Builder may edit. The storefront runtime and Builder therefore share the same component keys/versions, stable node ids, responsive overrides, bindings and configuration semantics.

## Existing authority that remains unchanged

- Page Schema/runtime: `storefront-foundation.ts`, `storefront-runtime.ts`, `storefront-page-schema.ts`.
- Component/template manifests and registries remain source-controlled allowlists.
- Tenant scope is derived server-side through the existing store context/RBAC authority.
- Capability checks delegate to the existing Block 11 Alap/Pro entitlement authority.
- Draft persistence remains `save_storefront_page_draft_v1`.
- Preview remains `create_storefront_preview_session_v1` and one immutable draft revision.
- Publish remains `publish_storefront_page_v1`.
- Rollback remains `rollback_storefront_page_v1` and creates a new monotonic published revision.
- Template installation/switch remains draft-only and never implicitly publishes.

## Visual Builder launch scope

1. Real merchant-facing canvas using the same Page Schema and shared runtime renderer semantics as the storefront.
2. Page -> section -> component hierarchy selection and outline.
3. Manifest/schema-constrained add, remove, duplicate and reorder operations, including pointer drag/drop plus accessible move controls.
4. Inspector that exposes only `manifest.configurable`, declared binding slots and responsive capabilities.
5. Layout editing through existing component configuration, including shared spacing tokens and grid gap.
6. Desktop / Tablet / Mobile editing and preview of one Page Schema document; responsive changes are stored only in the existing `responsive` override map.
7. Layered hero/banner editing through the existing `visual.layered-canvas` / `visual.layer` nodes and their declared configuration — never through baked-in image text or arbitrary component injection.
8. Undo/redo as client-side draft working-copy history only. Undo/redo is not persistence or publication authority.
9. Explicit draft save against the expected draft revision with idempotent operation keys. The saved immutable draft revision is authoritative after refresh.
10. Preview, publish and rollback invoke only the existing lifecycle authority.
11. Template-materialized draft pages are editable without converting them to another document type.
12. Protected system components cannot be removed or moved outside their manifest/schema contract.
13. Alap/Pro component availability fails closed through existing capability metadata and server-side entitlement resolution.

## Planned guarded Preset Gallery extension

This is a roadmap extension over the existing Section Preset authority, not a second Builder/runtime. The merchant-facing experience may use a rich visual gallery with category filters, thumbnails, larger previews and one-click insertion, but every inserted block must materialize through the canonical `Template -> Page Presets -> Section Presets -> Components` chain.

Required behavior:

- factory presets are source-controlled, versioned and quality-gated; merchant Saved Blocks remain a separate tenant-owned library;
- insertion produces ordinary editable Page Schema nodes with fresh identities and keeps the existing draft/preview/publish lifecycle;
- shared compositions inherit the active template/global design system; template-specific signature presets are allowed only where the visual concept genuinely requires them;
- no preset may carry its own business authority, renderer, breakpoint engine, persistence model, entitlement model or publication path;
- preview thumbnails must use a bounded/lightweight strategy and must not cause the Builder library itself to instantiate an unbounded number of live storefront runtimes.

### Preset insertion hard gate

Before a factory preset can be inserted, the resulting working document must pass the same registry/schema/capability validation used by normal Builder mutations **and** the canonical storefront performance contract. A hard structural budget violation must block insertion rather than merely warn.

Factory eligibility additionally requires true Desktop/Tablet/Mobile proof, responsive-isolation proof, accessibility/state checks and runtime performance evidence. Presets may not solve a layout problem with duplicated hidden breakpoint DOM, unbounded layer trees, eager below-fold media, expensive animation, third-party runtime dependencies or arbitrary HTML/JavaScript.

The gallery is therefore a curated composition system, not an unrestricted block marketplace. If a candidate block requires weakening an accepted Page Schema, responsive, security, performance or commerce-authority rule, the block is rejected.

## Security and mutation boundary

The Builder must reject:

- client-supplied tenant authority;
- client-supplied entitlement authority;
- arbitrary component keys/versions not present in the server registry;
- configuration keys not declared editable by the component manifest;
- invalid parent/child composition;
- arbitrary JSON/SQL/RPC editing;
- raw HTML or JavaScript injection that bypasses component renderers;
- direct mutation of products, variants, orders, customers, inventory, workflow or other business authorities.

Every persisted edit is validated again on the server against the Page Schema registry and current capability context before the existing draft RPC is called.

## Responsive contract

Desktop, Tablet and Mobile are presentation/editing modes of one document. They do not create separate pages. The existing breakpoint contract remains authoritative, and viewport-specific Builder controls only write schema-supported responsive overrides (`hidden`, `gridSpan`) while ordinary component configuration remains shared unless a component schema already models responsive configuration itself.

## Live preview contract

The canvas is not a static design mock. It renders the current Page Schema working copy with the same registered component renderers and responsive resolution semantics used by the storefront runtime. Persisted preview uses the existing immutable preview-session authority.

## Persistence / Fresh Install impact

Block 22 requires no new database schema. The existing storefront persistence and template installation migrations already provide draft, preview, publish, rollback, audit, optimistic concurrency and idempotency. Therefore the ordered customer baseline remains 0001–0017 and the existing genuine Fresh Install proof remains valid unless implementation uncovers a real schema requirement.

## Acceptance invariants

Block 22 is releasable only when a dedicated non-Water-K staging tenant proves: open/edit/reorder/add/duplicate/remove; responsive Desktop/Tablet/Mobile; save and refresh persistence; immutable draft preview; publish; later draft isolation from published output; monotonic rollback; replay/idempotency; tenant isolation; unauthorized mutation fail-closed; Alap cannot activate Pro-only components; and schema-external structure/configuration is rejected.

Water-K must retain its existing business data and must not receive an automatic storefront page, template activation or Builder activation as a release side effect.
