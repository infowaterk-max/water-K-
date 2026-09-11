# Roadmap Block 21 – Page Schema / Templates

Status: implementation in progress

## Canonical reconstruction

Block 21 promotes the already-proven Storefront Runtime / Template scale-out foundation into the canonical Shoporation Page Schema and template authority. It does not introduce a second storefront engine, a second publish authority, or a Visual Builder interaction layer.

The canonical hierarchy is:

`Template -> Page Presets -> Section Presets -> Components`

Repository history fixes the Block 21 / Block 22 boundary:

- the Builder Compatibility Foundation already defines the shared 12-column layout contract, semantic design-token vocabulary, stable page types, component/template manifests, capability metadata and forward-only migration policy;
- Storefront Runtime Wave 0A–0D already provides versioned Page Schema documents, component and template registries, allowlisted bindings, responsive resolution, immutable draft/published revisions, preview capabilities, publish/rollback, template install/switch planning and atomic multi-page draft materialization;
- the scale-out waves provide concrete category-specific template packages and repeatedly require common runtime/grid authority, stable node identities and desktop/tablet/mobile responsiveness;
- the accepted launch plan tracks a **42-template portfolio target**, but Block 21 must register only concrete source-controlled packages actually present in the repository. Missing portfolio entries must never be fabricated merely to satisfy cardinality;
- the actual drag/drop editor, canvas, property inspector, resize handles and interactive rearrangement engine remain Roadmap Block 22.

## Canonical authority map

### Page Schema

`src/lib/builder/storefront-foundation.ts` and `src/lib/builder/storefront-runtime.ts` remain canonical for:

- Page Schema versioning and stable page/node identity;
- the page-type vocabulary (`home`, `catalog`, `product`, `cart`, `checkout`, `account`, `search`, `content`, `blog-index`, `blog-article`, `faq`, `contact`, `legal`, `not-found`);
- ordered sections and nested versioned component nodes;
- component configuration, allowlisted binding references and responsive overrides;
- desktop/tablet/mobile responsive inheritance and the common 12-column grid;
- template/page identity and explicit forward-only schema migration;
- capability validation against the existing Block 11 plan/feature authority.

Block 21 may add schema metadata required by a future editor, but that metadata is descriptive authority only. It must not execute editing interactions.

### Template packages and catalog

Concrete template packages remain source-controlled, immutable package definitions. The Block 21 catalog enumerates and resolves only packages present in repository source. Each catalog entry is versioned by `templateKey + templateVersion`, retains manifest `minPlan` / `requiredFeatures`, and declares the Page Schema presets it ships.

The repository separately tracks the accepted 42-template launch target. Catalog completeness is therefore observable as `implemented` versus `remaining`; it is not falsified with placeholder or invented templates.

A catalog entry does not activate a template for any tenant. Registration is code discovery; installation remains an explicit tenant-scoped mutation.

### Installation and activation boundary

`src/lib/builder/storefront-template-installation.ts`, `src/lib/builder/storefront-template-persistence.ts` and database RPC `save_storefront_template_drafts_v1` remain canonical for install/switch/upgrade/refresh materialization.

Template installation:

- materializes Page Schema **drafts only**;
- is tenant-scoped and owner/admin/platform-authorized;
- is optimistic-concurrency guarded and idempotent;
- is atomic across all materialized pages;
- does not mutate product, variant, collection, customer, order, B2B or other business-state authority;
- does not publish or activate storefront output as a release side effect.

### Revision / preview / publish / rollback authority

The existing `storefront_pages`, `storefront_page_revisions`, `storefront_preview_sessions` and `storefront_page_events` model remains canonical:

- drafts and published revisions are immutable snapshots;
- preview tokens resolve one immutable draft revision and are revocable/expiring;
- publish copies the expected draft to a new immutable published revision;
- rollback is monotonic: it copies a historical published revision into a new published revision rather than rewriting history;
- mutation RPCs re-check tenant/RBAC authority inside the transaction and emit audit evidence.

Block 21 may expose a canonical runtime source contract over those authorities, but must not create a second publication state.

## Shared layout, responsive and design contract

All templates use the common foundation rather than template-local layout engines:

- 12-column responsive grid;
- desktop / tablet / mobile viewports with deterministic inheritance;
- common content-width, gutter, gap and layout-preset vocabulary;
- semantic color, typography, spacing, radius and shadow token keys;
- stable component key/version rendering;
- layered hero/banner content is represented as ordinary versioned component configuration and binding slots, not baked-in image text;
- the same Page Schema is resolved for every viewport; there is no separate mobile page authority.

Responsive preview is therefore a runtime interpretation of the same document. Block 21 defines the preview/runtime contract only; interactive device controls belong to UI layers and the Visual Builder remains non-scope.

## Basic / Pro and category boundaries

Template and component capability requirements continue to delegate to the Block 11 entitlement authority. A template package may declare a minimum plan and required feature codes. Component-level Pro/add-on requirements are checked by the same runtime capability gate.

Block 21 must not infer a Pro entitlement from template styling, category or tenant identity, and must not create a second plan table.

Category-specific design/commerce contracts remain package metadata and component composition. They may change presentation and available preset composition, but they may not replace product, pricing, inventory, checkout, workflow, recommendation or other business authorities.

## Storefront preview and published runtime relationship

The canonical runtime source relation is:

1. authenticated draft work is persisted as immutable draft revisions;
2. a preview capability may resolve a specific immutable draft revision without changing the published head;
3. the public storefront consumes only the current immutable published revision when runtime routing is enabled for that tenant/page;
4. publishing/rollback changes the canonical published head only through the existing transactional authority;
5. template install/switch never implicitly publishes.

A release must not switch Water-K or any other tenant onto Page Schema runtime as an incidental side effect.

## Builder-ready schema metadata

Block 21 exposes read-only editability metadata derived from component manifests, including:

- configurable property keys;
- declared binding slots;
- responsive behavior and grid-span capability;
- child/container policy;
- protected-system status;
- minimum plan / required features;
- stable schema slot and component version.

This metadata is the contract that Block 22 can later consume. It is not an editor.

## Customer baseline / Fresh Install impact

The persistence authorities required by Block 21 already exist in the ordered customer baseline:

- `0004_storefront_runtime_persistence.sql`;
- `0005_storefront_template_installation.sql`.

Block 21 must not create a duplicate schema merely to rename or re-own those authorities. If implementation can remain within their current contract, the customer baseline stays unchanged and the existing proof remains valid. If a genuine schema requirement forces a new customer migration, the manifest must immediately return to proof-pending and a new genuine empty-target Fresh Install proof is mandatory before merge.

## Explicit Block 22 non-scope

Block 21 does **not** implement:

- drag-and-drop editing;
- visual canvas/editor surface;
- inspector/property-panel UI;
- resize handles;
- pointer/keyboard rearrangement interactions;
- merchant-facing block ordering UX;
- inline WYSIWYG editing;
- any second business-state or publication authority.

The Block 21 schema may describe what is editable so Block 22 can safely consume it later.

## Acceptance invariants

Block 21 is releasable only when:

1. the catalog truthfully enumerates every concrete source-controlled template package included in the current release and separately reports progress toward the accepted 42-template launch target;
2. every catalog package uses the shared Page Schema/runtime/grid/token authority rather than a template-local runtime engine;
3. every catalog package keeps deterministic template identity, capability metadata and declared page-preset coverage;
4. Basic/Pro and feature gating fail closed through the existing entitlement/capability authority;
5. preview and published rendering consume the same Page Schema semantics while retaining distinct immutable lifecycle state;
6. install/switch/upgrade/refresh remain draft-only until the existing publish authority is invoked;
7. unknown forward-compatible config remains preserved by the existing schema migration policy;
8. Visual Builder interaction flags remain disabled and no Block 22 UI is introduced;
9. tenant isolation, RBAC, idempotency/optimistic concurrency and audit/evidence regressions are green;
10. Water-K storefront/business invariants remain unchanged before and after release.
