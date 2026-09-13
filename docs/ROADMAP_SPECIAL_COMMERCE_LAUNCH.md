# Shoperation 1.0 — Special Commerce / Add-on Launch Inventory

Status: canonical reconstruction after the Visual Builder capability foundation (`Saved Blocks -> Linked Symbols -> Variants -> Presets -> Global Styles -> Page Templates -> Responsive/Layout Depth`).

This document intentionally does **not** define “8 add-ons”. A product-facing experience may be a Pro capability, an optional add-on, or a composition over an already shared engine. Packaging and engine count are separate concerns.

## Classification

| Capability family | Evidence / current engine | Launch classification | Work remaining |
|---|---|---|---|
| Interactive Scene / Shop the Look | Fashion template specs deferred a shared Interactive Scene/Composer; no canonical shared engine existed before this wave | Shoperation 1.0 launch-blocking, Pro | Wave 1 adds shared engine, Builder component, D/T/M hotspot geometry, authoritative product binding and DB-backed Pro gate |
| Shop the Room / scene commerce | Home template specs require Shop the Room; AR is separately deferred | Shoperation 1.0 launch-blocking, Pro | Reuse Interactive Scene foundation; add room/set composition rules where the accepted template requires them |
| Guided Finder / Gear Finder / Product Finder | `src/lib/commerce/guided-finder.ts` (`shoporation.guided-finder.v1`) | Shoperation 1.0 launch-blocking where templates require it | Do not rebuild engine; close Builder UX, entitlement and acceptance gaps |
| Multi-product Composer / Build-a-Box / full set | shared multi-product composer engine exists | Shoperation 1.0 launch-blocking where templates require it | Do not rebuild engine; close Builder UX, entitlement and acceptance gaps |
| Product Configurator | shared configurator engine exists | Shoperation 1.0 launch-blocking where templates require it | Builder/entitlement/acceptance hardening only |
| Compatibility / fit decision support | shared compatibility engine exists | Shoperation 1.0 launch-blocking where templates require it | Builder/entitlement/acceptance hardening only |
| Compare / structured spec decision support | shared compare/spec foundations exist | Shoperation 1.0 launch-blocking where templates require it | Builder/entitlement/acceptance hardening only |
| Recipe-to-Cart | accepted Food Pro experience; no canonical shared Recipe Commerce engine found | Shoperation 1.0 launch-blocking, Pro | Build shared Recipe Commerce engine; authoritative ingredient-to-product mapping, quantity/portion logic, substitutions and availability |
| Allergen / dietary logic | accepted alongside Food/Recipe experience; no canonical shared authority found | Shoperation 1.0 launch-blocking with Recipe Commerce | Structured authoritative data only; no inferred allergens or dietary claims |
| Drop / Release | template specs explicitly deferred a reusable engine | Shoperation 1.0 launch-blocking where accepted template requires it | Build shared release state engine; real release time/product eligibility/stock; no fake countdown or fake scarcity |
| Interactive product presentation / multi-view / 360 | partial Pro presentation capability exists in template/runtime foundations | Shoperation 1.0 launch-blocking only for accepted non-3D presentation | Close Builder editability, responsive, a11y and performance acceptance |
| AR / advanced 3D / exploded product | explicitly deferred premium capability | Post-launch | Does not block Shoperation 1.0 |
| AI Builder | separate Builder generation scope | Deferred activation, not deferred development | Must be production-ready before 1.0 but server-side hidden/disabled until controlled post-customer activation |

## Authority boundary

All launch special-commerce experiences are presentation/decision/composition engines over the existing commerce truth. They must not create a second authority for product, variant, pricing, inventory, cart, checkout, order or payment state.

Builder configuration may store presentation state (scene type, hotspot geometry, labels, recipe presentation, finder question flow, release presentation), but authoritative commerce values are resolved at runtime.

## Entitlement boundary

Special-commerce availability must be checked server-side. UI hiding is not an authority. Revoked/missing entitlement must fail closed at Builder save/publish and runtime. Product/package classification (Alap / Pro / paid Add-on) is explicit per capability and must not be inferred from template ownership.

## Wave order after capability freeze

1. Interactive Scene Commerce (Shop the Look foundation; reusable by Shop the Room/setup/gear scenes).
2. Recipe Commerce + allergen/dietary structured authority.
3. Drop / Release Engine.
4. Room/Scene Composer specialization on the Interactive Scene foundation.
5. Existing engine closure: Guided Finder, Multi-product Composer, Configurator, Compatibility, Compare/Spec, non-3D interactive presentation.
6. Cross-engine Builder/entitlement/responsive/a11y/performance/security acceptance.
7. Only after all launch engines are green: full 42-template Template 2.0 recomposition.

## Wave 1 acceptance target

Interactive Scene Commerce is complete only when the same Page Schema component supports create/configure/save/preview/publish/rollback, Desktop/Tablet/Mobile hotspot inheritance, keyboard-accessible product links, bounded media/layer complexity, tenant-scoped product binding, DB-backed Pro entitlement, and fail-closed runtime behavior. Price/stock/product eligibility are read projections and remain non-editable in scene config.
