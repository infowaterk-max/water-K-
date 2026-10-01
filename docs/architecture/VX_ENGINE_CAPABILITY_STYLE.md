# VX Engine / Capability Style Authority

## Principle

A storefront **engine is a shared capability, not a template feature**.

Shop the Look / Shop the Room, Finder, Composer, Configurator, Compatibility, Recipe Commerce and Release Commerce may be composed into any page where their canonical component manifest, plan/features and parent-child rules allow them. A template can choose to feature an engine in its factory design, but it does not own or fork that engine.

## Presentation inheritance

Engine presentation resolves in this order:

1. Template DNA / storefront global design tokens.
2. Engine visual preset, where a canonical preset exists.
3. Optional local `engineStyle` override on that engine instance.

An omitted local token means **inherit**, not reset. This is required so existing templates continue rendering unchanged and the future Blank Studio can start from neutral global design tokens.

## Editable color contract

`engineStyle` is deliberately semantic and bounded. The editable color vocabulary is background, surface / muted surface, text / muted text, border, primary / primary contrast, and accent / secondary accent / tertiary accent.

Values are strict `#RRGGBB` colors. Arbitrary CSS properties, arbitrary CSS custom-property names, HTML and JavaScript are not accepted.

The Builder UI may later expose these tokens as merchant-friendly controls such as Háttér, Felület, Szöveg, Elsődleges and Kiemelés. That UI edits this contract; it does not create a second styling authority.

## Authority boundary

Color overrides change presentation only. They never change component entitlement, product eligibility, price, stock, variants, hotspot/product identity, cart/checkout behavior, engine configuration documents or persistence/publication authority.

The runtime application must scope generated CSS variables to the concrete engine root so sibling engines and the template global design system remain unaffected.

## Shop the Look

Shop the Look is a specialization of the shared `commerce.interactive-scene@1` capability. A fashion template may ship a curated visual preset for it, but the engine and its style contract are shared. Blank Studio can therefore insert the same Interactive Scene, configure its canonical structure and recolor it without importing a fashion-template implementation.

## Guarded Freedom

The style contract intentionally does not expose unrestricted CSS. If a future visual requirement cannot be represented safely by the semantic token vocabulary, the Core contract is extended deliberately and versioned rather than bypassed with raw CSS.
