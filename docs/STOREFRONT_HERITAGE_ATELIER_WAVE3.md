# Storefront Implementation Wave 3 — E10 Editorial / Story Engine + Golden #3 Heritage Atelier

## Purpose

Wave 3 implements **E10 — Editorial / Story Engine v1** and consumes it in **Golden #3 Heritage Atelier**.

The implementation is stacked on the completed Wave 2 Tech Deck branch and remains a storefront/runtime read-model layer. It does not introduce a new SQL migration, content persistence authority, live storefront route switch, production/shared-staging mutation or payment change.

## Dependency chain

Wave 3 starts from Wave 2 final head:

`8820df09560226f4053f8725ad59f1254ab6efce`

Stacked dependency order:

1. PR #115 — B2B Account Ownership
2. PR #117 — Storefront Runtime Wave 0
3. PR #122 — Golden #1 Monarche / Core Commerce
4. PR #123 — Structured Data / Golden #2 Tech Deck
5. Wave 3 — E10 / Golden #3 Heritage Atelier

Wave 3 must remain stacked until the lower layers land in order.

## E10 — Editorial / Story Engine v1

Engine version:

`shoporation.editorial-story-engine.v1`

E10 provides one structured story authority for editorial commerce surfaces. It deliberately avoids arbitrary raw HTML and avoids duplicating product/catalog authority.

### Registered story types

- `lookbook`
- `maker`
- `journal`
- `origin`
- `process`
- `before-after`

Each story type declares allowed block types and, where needed, required relation types.

### Structured Story Document v1

A story contains:

- stable id and slug;
- story type;
- lifecycle status;
- title and excerpt;
- structured author;
- taxonomy;
- optional hero image;
- typed relations;
- structured blocks;
- published / updated timestamps.

### Story blocks

Supported structured blocks:

- heading
- prose
- quote
- image
- image + text
- facts
- timeline
- relation grid
- provenance claims

There is deliberately no arbitrary `rawHtml`, script, iframe or executable block type.

### Relations

Supported story relations:

- story ↔ product
- story ↔ collection
- story ↔ maker
- story ↔ story
- story ↔ origin

Relations carry only identity/navigation evidence needed by E10. Story relations must not duplicate product/pricing/inventory/order authority.

Runtime validation rejects unsupported relation fields and explicitly detects duplicated product authority fields such as price, stock, inventory, SKU or variants.

### Provenance safety

A provenance claim can render only when it references an explicit `origin` relation marked `verified=true`.

The validator fails closed with `STORY_PROVENANCE_UNVERIFIED` when a claim has no verified origin evidence.

This prevents Heritage Atelier from fabricating heritage, maker or origin claims from template copy.

### URL / markup safety

Story validation rejects:

- unsafe relation URLs;
- unsafe image URLs;
- script-like/raw executable markup in text content.

Renderer components also apply the existing relative/HTTPS allowlist boundary for links and images.

### Publishing lifecycle

Lifecycle states:

- draft
- published
- archived

Rules:

- draft stories are hidden from normal runtime and visible in preview;
- published stories require a valid UTC `publishedAt` and render only after that instant;
- archived stories are hidden normally and may be inspected in preview;
- invalid story documents never produce a read model.

### Taxonomy / authors

E10 normalizes category/tag values and preserves structured author identity independently from the active storefront template.

### Template-switch persistence

Story Documents remain independent content authority. Template switching may materialize storefront Page Schema drafts but does not mutate:

- Story Documents
- products
- collections
- makers
- orders
- customers

`STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY` and regression tests lock this contract.

## Reusable storefront Story components

Wave 3 adds registry-driven components on top of the Wave 0/1/2 stack:

- `story.hero`
- `story.feature`
- `story.provenance`
- `story.timeline`
- `story.body`
- `story.index`
- `story.service-care`

The shared renderer remains component-key + version driven. There is no `jewelry.heritage-atelier` conditional branch in the runtime.

## Golden #3 Heritage Atelier

Template identity:

- key: `jewelry.heritage-atelier`
- version: `1`
- minimum plan: `alap`
- demo namespace: `jewelry-heritage-atelier`

### Visual DNA

Heritage Atelier direction:

- heritage luxury × craftsmanship × provenance × editorial commerce;
- warm ivory / parchment background;
- deep charcoal text;
- burgundy and antique brass accents;
- muted stone secondary tones;
- serif editorial display typography + clean sans UI;
- macro material / workshop / craft imagery;
- generous editorial whitespace;
- restrained luxury chrome.

## Approved Home composition

The Page Schema metadata locks this order:

1. Heritage Hero
2. Featured Collection Story
3. Craftsmanship Feature
4. Product Selection
5. Maker/Atelier Story
6. Material & Origin
7. Timeline/Heritage
8. Editorial Commerce Grid
9. Journal
10. Service/Care
11. Footer

## Page package

Heritage Atelier ships 14 declared Page Schema presets:

1. Home
2. Catalog
3. Product
4. Search
5. Cart
6. Checkout
7. Account
8. Content / structured Story detail
9. Blog Index
10. Blog Article
11. FAQ
12. Contact
13. Legal
14. Not Found

The `content` preset is marked `contentRole = story-detail` and consumes E10 Story read models.

## Product page

The product page reuses Wave 1/2 commerce primitives:

- 7/12 media gallery;
- 5/12 buybox;
- generic option selector;
- E7-compatible key specs for material/size when available;
- purchase CTA;
- separate E10 object story;
- verified provenance panel;
- recommendations.

E7 is useful for structured material/spec data, but E10 does not replace or duplicate E7.

## Engine boundaries

Heritage Atelier declares:

- E1 Runtime — consumed from Wave 0;
- E2 Product Discovery — binding contract only;
- E10 Editorial / Story Engine v1 — implemented here;
- E13 Checkout — binding contract only;
- E7 Compare & Spec — useful optional structured material/spec support.

Checkout remains provider neutral. No K&H/vPOS credential, merchant identifier or payment secret is embedded in Page Schema.

## Template installation safety

Wave 3 inherits Wave 0D installation boundaries:

- storefront Page Schema drafts: allowed
- products: no direct mutation
- variants: no direct mutation
- customers: no direct mutation
- orders: no direct mutation
- B2B: no direct mutation

Story authority is additionally kept outside the template-switch mutation boundary.

Demo fixtures use the isolated `jewelry-heritage-atelier` namespace.

## Regression coverage

Wave 3 adds evidence for:

- registered Story types;
- story document validation;
- author/taxonomy normalization;
- draft/published/archived preview lifecycle;
- fail-closed provenance verification;
- product-authority duplication rejection;
- unsafe URL rejection;
- arbitrary script/raw-markup rejection;
- Story Document preservation across template switch;
- 14 Heritage page presets;
- Alap Template Capability Gate compatibility;
- approved Home ordering;
- Home runtime rendering with commerce + story bindings;
- structured Story detail rendering;
- no raw script execution surface;
- draft-only template installation;
- demo namespace isolation;
- E13 provider-neutral checkout.

## CI evidence

Pre-documentation implementation head:

`ccedcf22527646533a8aa0f45d8d87499ff0eb20`

GitHub CI #1890 / Actions run `34209374383`: **SUCCESS**.

Verified gates:

- production dependency security audit: PASS
- customer database baseline guard: PASS
- quality tests: PASS — **193 files / 1265 tests**
- TypeScript check: PASS
- production build: PASS
- release manifest generation/upload: PASS
- Fresh Install proof: intentionally SKIPPED because Wave 3 introduces no baseline migration

Release manifest evidence:

- version: `v24`
- SHA: `ccedcf22527646533a8aa0f45d8d87499ff0eb20`
- environment: `ci`
- release hash: `f932ee96f472b9442d3db26b50fc186fa69839c895e20863aa674bc602f75645`

The documentation commit must also pass full branch CI before Wave 3 is considered documentation-complete.

## Diff evidence

Compared with Wave 2 head, the implementation commit is one commit ahead and adds exactly 10 Wave 3 files:

- E10 engine
- Story component registry
- Story renderer registry
- Heritage Atelier template package
- 2 regression test files
- 4 deterministic demo SVGs

No existing business file is modified by the implementation commit.

## Explicit non-scope

- no SQL migration;
- no content admin persistence implementation;
- no new product authority;
- no live storefront route switch;
- no Visual Builder drag/drop UI;
- no E2 replacement;
- no E7 replacement;
- no E13 replacement;
- no payment/K&H/vPOS changes;
- no production/shared-staging mutation;
- no production Vercel deployment;
- no Water-K tenant status change.

## Release discipline

Wave 3 must remain a stacked Draft PR on Wave 2 / PR #123. A green CI authorizes code-level acceptance only; it does not authorize production rollout or bypass the PR #115 → #117 → #122 → #123 dependency chain.
