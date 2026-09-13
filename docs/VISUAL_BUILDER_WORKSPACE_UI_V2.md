# Visual Builder Workspace UI v2

Status: implementation branch, stacked on `feature/storefront-responsive-layout-depth-v1`.

## Product authority

This workspace is the accepted Shoperation Visual Builder visual direction. It reorganizes existing Builder capabilities without creating a second Page Schema, renderer, publication authority, commerce authority or AI surface.

The visual authority is the approved Shoperation light workspace:
- dedicated Builder shell, separate from Admin;
- persistent top command bar;
- left navigation/library zone;
- central live Storefront Runtime canvas;
- right contextual inspector;
- Shoperation turquoise/white visual language.

## Workspace contract

### Top bar
- Back to Admin;
- current page;
- Desktop / Tablet / Mobile;
- undo / redo;
- save state;
- Save;
- History;
- Preview;
- Publish.

Publish opens a readiness review first. The review consumes existing Fidelity diagnostics and the existing publication action. It is not a second release gate or publication state machine.

### Left workspace
- Pages;
- Add;
- Layers;
- Templates / Page Templates;
- Presets;
- Saved Blocks;
- Global Elements / Fidelity controls.

The left side is navigation and libraries. It no longer owns the selected-node property editor.

### Canvas
The canvas continues to use `StorefrontRuntimeRenderer` with the canonical component and renderer registries. Selection decoration remains Builder-only chrome.

### Right inspector
The selected element is edited in one contextual inspector:
- Content;
- Appearance;
- Responsive;
- Advanced.

The quick-edit row is navigation into existing controls, not a second intent or style authority.

### Responsive
Desktop, Tablet and Mobile remain views of one Page Schema. Mobile shows an explicit override-context notice so merchants understand that breakpoint-specific changes are scoped.

### Publish readiness
The drawer displays only evidence already available from:
- saved draft state;
- Fidelity accessibility diagnostics;
- Fidelity responsive/layout diagnostics;
- structural performance contract;
- Design Guard metadata.

No fake link scan, Lighthouse score, SEO score or other unsupported claim is introduced.

## AI launch boundary

AI Builder stays absent from merchant navigation and the Builder UI. The accepted product policy remains dark launch: developed separately, server-disabled for ordinary tenants, and introduced only after the initial customer cohort.

## Special Commerce boundary

Special Commerce engines continue on their own stacked wave chain. This UI branch intentionally starts from the stable Responsive/Layout Depth head so the moving Add-on implementation does not destabilize the workspace refactor. Interactive commerce components automatically appear through the canonical registry after the stacks are reconciled.

## Guardrails
- Draft only;
- no `main` merge without acceptance;
- no production deploy;
- no production Supabase mutation;
- no Page Schema widening for visual chrome;
- no arbitrary HTML/CSS/JS;
- no duplicated storefront Runtime;
- no hidden responsive duplicate DOM;
- no AI merchant UI;
- no commerce-state mutation from visual-only controls.
