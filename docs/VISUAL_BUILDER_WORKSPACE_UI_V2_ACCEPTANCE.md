# Visual Builder Workspace UI v2 — engineering acceptance

Base: `feature/storefront-responsive-layout-depth-v1@2d26a99060dcd7e3c6e68194beb938cc12965473`

Final head: `65ebc064b05c69a5dae19d52499f759009ff229b`

## Scope
- accepted Shoperation light/turquoise dedicated Builder shell;
- left navigation/libraries, central live Runtime canvas, right contextual inspector;
- explicit Pages, Add, Layers, Templates, Presets, Saved Blocks and Global Elements workspaces;
- selected-node Content / Appearance / Responsive / Advanced inspector;
- mobile breakpoint editing notice;
- dedicated preset library panel on canonical preset actions;
- publish-readiness drawer based only on existing Fidelity diagnostics;
- AI Builder remains absent from merchant UI;
- no Page Schema, renderer, publication or commerce authority replacement.

## Exact-head verification
GitHub Actions CI run `34745697953` on exact final head: **PASS**.

- customer database baseline guard: PASS;
- Block 24 market-ready contract: PASS;
- quality tests: PASS;
- TypeScript check: PASS;
- production build: PASS;
- release manifest generation/upload: PASS;
- production dependency security audit: PASS;
- Fresh Install proof: skipped because this UI-only branch has no customer-baseline/schema change.

## Diff
Compared with the exact Responsive/Layout Depth base:
- 6 commits ahead;
- 6 changed files;
- no database migration;
- no production deployment;
- no production Supabase mutation.

## Parallel Special Commerce boundary
Special Commerce/Add-on waves are moving independently. This workspace branch intentionally remains based on the stable Responsive/Layout Depth head. After both streams reach their acceptance gates, the Add-on component registry/renderers can be reconciled into this workspace without redesigning the UI shell.

## Remaining acceptance
This is engineering acceptance, not final merchant UX acceptance. Final acceptance still requires authenticated visual/browser use of the Builder with representative storefronts and, later, the completed launch Add-ons.
