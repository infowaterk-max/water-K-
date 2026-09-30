# VX Builder Core

## Product authority

VX Builder Core is the single shared authoring engine for **VX Shop Builder** and the future **VX Site Builder**. The products are composed from one Core through product profiles and capabilities; they are not separate editor forks.

- **VX Shop Builder** is the Shoperation commerce-hosted product profile.
- **VX Site Builder** is the generic website product profile under VISION/VX.
- Product profiles may expose different component groups and terminology, but they must not create a second Page document, renderer, mutation engine or publication state.

The canonical Shoperation Page document, Storefront Runtime, Builder mutation authority and draft / preview / publish / rollback pipeline remain authoritative for the current Shop adapter. VX Builder Core is an interaction and product-composition layer over those authorities.

## PO-approved Visual First authority

The accepted workspace has four primary zones:

1. a slim top toolbar;
2. a left **Library** panel (not an admin-navigation sidebar);
3. the live WYSIWYG canvas;
4. the right Inspector.

The Shoperation product family supplies the visual language: light/ivory surfaces, graphite hierarchy, restrained warm gold/ochre accents, soft cards and shadows, and clear status feedback. The Core owns interaction rules, not Shoperation-specific commerce branding.

## Editing language

The primary structural model is:

```
Page
  Section
    Container
      Component
```

The merchant-facing library maps the canonical Template → Page Preset → Section Preset → Component model into visual choices.

The interaction order is **direct manipulation first, Inspector second**:

- contextual `+` controls appear only at structurally valid insertion points;
- selected sections/components receive contextual quick actions;
- duplicate/delete/move operations continue through canonical mutation validation;
- 12-column resize uses snapping and bounded spans;
- Desktop / Tablet / Mobile edits remain viewport-scoped canonical overrides;
- advanced technical controls are progressively disclosed.

## Guarded Freedom

VX Builder deliberately does **not** implement Wix-style unrestricted freeform editing.

Runtime speed, responsive stability and long-term editability outrank visual freedom when the two conflict. Generic Core interactions therefore forbid:

- arbitrary left/top coordinate persistence for ordinary content;
- unbounded grid spans;
- invalid parent-child insertion;
- raw HTML/JavaScript composition as a normal building primitive;
- uncontrolled widget/style proliferation;
- editor-only layout rules that differ from the shared Runtime.

Specialized layered components may have their own canonical positioning model, but that does not make absolute positioning a generic Builder primitive.

## Library strategy

The Core exposes the Library framework, contextual insertion contract, filtering, saved blocks, page/section presets and product-profile capability filtering. Broad visual preset population follows the Template Factory / template-portfolio sequencing; the Builder must not duplicate those authorities.

## Maybach + Brabus boundary

The **Maybach** layer is the VX Builder Core: canvas, component registry integration, Page Schema interaction, responsive editing, style system, history, preview/publish and guarded direct manipulation.

The **Brabus** layer is an intelligence extension point over the same Core: Smart Intent, Auto-Fix, Design Guard, Publish Readiness, inheritance intelligence and visual diagnostics. Brabus must invoke canonical Builder operations; it must never become a second editor or renderer.

## Non-negotiable invariants

- one Core, multiple product profiles;
- one canonical Page document and one Runtime;
- Shop/Site capability differences do not fork the editor;
- contextual insertion is registry/capability validated;
- resize values are integer spans from 1 through 12;
- responsive changes affect only the active canonical viewport override;
- protected nodes remain protected;
- the accepted shell has no additional Shoperation admin sidebar;
- completion requires fresh exact-head evidence through the Control Plane Truth Gate.
