# Shoperation Storefront Template × Add-on Integration Contract

Status: canonical product/design contract for storefront templates and storefront-facing add-ons.

## Purpose

A storefront add-on must behave as a native capability of the active storefront, not as a visually detached plugin. At the same time, the add-on must not permanently inherit the factory appearance of the template version it was first designed against.

The contract has two independent requirements:

1. **Factory-fit:** when Shoperation ships a template as production-ready, all supported add-ons must visually and structurally fit that template out of the box.
2. **Live-theme inheritance:** after the merchant customizes the template, the add-on must follow the storefront's current design state rather than preserving frozen factory styling.

## Canonical rule

> Add-ons inherit the **current storefront design system**, not the historical factory skin.

The factory template defines an initial visual configuration. The merchant may later change global colors, typography, spacing, radii, surfaces, button treatment, form treatment, density or other supported design tokens. Storefront-facing add-ons must resolve those current values at render/edit time.

An add-on must never require the merchant to restyle it manually simply because the template has been customized.

## Factory-fit requirement

When Shoperation publishes a template as finished / market-ready:

- every supported storefront add-on must have an accepted placement in that template;
- its initial composition must fit the template's visual grammar;
- its default surfaces, typography, controls, icons, spacing and responsive behavior must feel native;
- it must not look like a generic third-party widget inserted into the page;
- screenshot acceptance must include representative add-on states where the capability materially affects the storefront.

Factory-fit is an acceptance requirement, not an optional polish step.

## Live design inheritance

Add-ons must prefer shared/current design tokens and style contracts over hardcoded template values.

Where applicable, an add-on should resolve the current storefront values for:

- font families and type scale;
- text, muted text, background, surface, border and accent colors;
- primary/secondary button appearance;
- form field appearance;
- border-radius family;
- spacing/density scale;
- shadows/elevation/glow policy;
- icon treatment;
- container width and grid/gap behavior;
- responsive base values plus isolated Desktop / Tablet / Mobile overrides.

If the merchant changes the template globally, the add-on must follow those changes automatically unless the merchant explicitly created a local add-on override.

## No frozen factory skin

Do not encode add-on appearance as a static copy of the original template's colors or CSS values.

Bad model:

- Playroom add-on always uses the original cyan/magenta/navy values even after the merchant changes Playroom to a different palette.

Canonical model:

- Playroom ships with cyan/magenta/navy factory tokens;
- the add-on initially resolves those active tokens and therefore matches the shipped template;
- if the merchant changes Global Styles, the add-on resolves the new active values;
- any explicitly configured local override remains local and intentional.

## Style hierarchy

Storefront-facing add-on styling should follow this precedence model:

1. **Merchant local override on that add-on instance** — when the capability exposes supported local style controls.
2. **Current storefront/theme tokens and component styles** — the normal source of truth.
3. **Template-provided semantic preset/default** — used to define the factory-ready appearance, not as permanent frozen styling.
4. **Shared Shoperation fallback tokens** — fail-safe only.

A template-specific hardcoded style branch is not an acceptable long-term authority.

## Merchant editability

Where presentation is merchant-meaningful, add-ons must expose appropriate Builder controls without exposing internal implementation noise.

Depending on capability, this may include:

- layout/presentation preset;
- spacing and density;
- alignment;
- surface/background treatment;
- image/media choice and focal point;
- heading/supporting copy/CTA where presentation content is not business-authoritative;
- card style;
- number of columns/visible items within safe limits;
- responsive visibility or approved responsive overrides.

Business-authoritative values such as price, stock, payment state, compatibility truth, order state or provider response must remain data-bound and must not become editable decorative content.

## Discoverability requirement

An add-on is not considered product-complete merely because it is installed and technically callable.

> A normal merchant must be able to discover the capability where they would naturally look for it.

Therefore:

- the central Add-ons/Extensions area may exist, but it is not sufficient by itself;
- Builder must surface relevant capabilities in the page/section context where they can be used;
- Admin should expose configuration entry points from the relevant operational domain where appropriate;
- unavailable/Pro/paid capabilities may be shown contextually as discoverable locked capabilities, without aggressive upsell;
- the merchant should not need prior knowledge of an add-on's internal name to find it.

Examples:

- 3D/AR product view: discoverable from Product media / Product page Builder context;
- Shop the Look: discoverable from fashion PDP / outfit-related sections;
- compatibility capability: discoverable from product information / compatibility areas;
- recipe-to-cart: discoverable in recipe/content-commerce contexts;
- shipping provider: configured/used in Checkout → Shipping;
- payment provider: configured/used in Checkout → Payment.

## Contextual insertion points

Add-ons declare capabilities and approved insertion points; templates define how those insertion points are composed visually.

Examples of semantic insertion points:

- `product.media.after`
- `product.buybox.after`
- `product.compatibility`
- `product.related`
- `catalog.discovery`
- `content.commerce`
- `cart.recommendations`
- `checkout.shipping.methods`
- `checkout.payment.methods`
- `account.order-details`

Exact implementation names may evolve, but the architectural rule remains: add-ons attach to semantic page responsibilities, not arbitrary coordinates or one-off template DOM structure.

### Product downloads placement contract

The shared `commerce.downloads-tile` follows a portfolio-wide PDP placement rule for **all current and future storefront templates**:

- if the PDP already has a natural facts/specification/compatibility cluster, the compact downloads tile joins that cluster as a peer surface;
- the exact visual composition remains template-specific: fashion may place it beside size/material facts, tech beside specifications/compatibility, beauty beside ingredients/usage facts, gaming beside game/platform data, and so on;
- the shared composition engine identifies semantic fact surfaces rather than relying on Playroom-specific node IDs or fixed coordinates;
- purchase/buybox controls are not treated as a facts cluster merely because a key-spec component is nested inside the buybox;
- if no suitable semantic cluster exists, the fallback is a compact standalone downloads surface immediately after the primary product gallery/buybox section;
- the tile must never be buried near the footer;
- public Product Documents may be downloaded from the PDP;
- account-only documents and purchased digital assets remain under `Fiókom → Letöltéseim` and keep their existing authorization/entitlement boundaries.

This rule is part of Template Factory acceptance. A new template does not need a template-local downloads engine, but its PDP composition must pass the shared placement contract before market-ready acceptance.


## Checkout integration

The canonical checkout flow remains:

**Cart → Shipping → Payment → Summary**

with guided accordion/dropdown behavior:

- only the active step is expanded;
- completed steps collapse to concise summaries/check states;
- desktop keeps a persistent/sticky order summary where appropriate;
- shipping and payment providers integrate inside their semantic checkout steps;
- no shipping/payment add-on may create a detached competing checkout flow;
- provider-specific UI inherits the current checkout/template design system while provider/business state remains authoritative.

## Template compatibility model

The same add-on capability may render differently across templates while using the same shared functional contract.

Example:

- `product.related-look` can be elegant editorial composition in a luxury/fashion template;
- the same capability can use a denser, high-energy presentation in another template;
- the data/behavior contract remains shared;
- the template controls factory composition and semantic preset;
- current merchant design tokens control the live appearance.

Do not duplicate the add-on engine per template merely to achieve visual parity.

## Presets and defaults

Template-specific add-on presets are allowed and encouraged when they improve factory-fit, provided they are semantic defaults rather than frozen skins.

A preset may define:

- recommended placement;
- initial layout variant;
- initial density/column count;
- semantic accent role;
- media ratio;
- which optional sub-elements are visible.

A preset must not permanently pin colors/fonts/radii to historical values when those properties are supposed to inherit Global Styles.

## Reset behavior

Where local style overrides are supported, the Builder should make it possible to return the add-on to inherited/theme styling.

Conceptually:

- **Inherit from storefront** = default/canonical state;
- **Local override** = intentional instance customization;
- **Reset to inherited** = removes the local override and resumes live-theme inheritance.

This distinction prevents stale styling after later theme changes.

## Acceptance matrix

A storefront-facing add-on/template integration is not accepted until all relevant states pass:

1. **Factory template + add-on enabled** — visually native and correctly placed.
2. **Merchant changes global palette** — add-on follows current palette.
3. **Merchant changes typography/radius/spacing** — add-on follows supported current design tokens.
4. **Local add-on override applied** — only the intended instance diverges.
5. **Local override reset** — add-on resumes theme inheritance.
6. **Desktop/tablet/mobile** — placement and responsive behavior remain coherent.
7. **Empty/loading/error/locked states** — still visually native and understandable.
8. **Builder discovery** — merchant can find the capability in the expected context.
9. **Admin discovery** — operational configuration is reachable from the expected domain when relevant.
10. **Data authority** — visual customization never replaces real commerce/provider state.

## Market-ready template gate

A Shoperation template must not be called fully market-ready solely because its core pages are visually accepted.

Before release, verify the set of add-ons/capabilities that are expected to work with that template and confirm:

- native factory appearance;
- semantic placement;
- product-download placement follows the shared facts-cluster-first / primary-PDP fallback contract;
- discoverability;
- live design inheritance;
- Builder editability where applicable;
- responsive/accessibility quality;
- no duplicated template-specific add-on engine.

The goal is that a merchant can install a finished Shoperation template, enable supported capabilities, customize the storefront months later, and never feel that the add-ons belong to a different product or to an old version of the design.

### Cart customer-task contract

The cart is a customer task surface across **all storefront templates**, not a place to explain internal commerce-engine guarantees.

Required portfolio-wide behavior:
- keep the primary cart focused on cart lines, quantity, authoritative price/total, checkout continuation, and optional relevant recommendations;
- do not add decorative panels whose purpose is to tell the shopper that price, stock, or final validation is "real", authoritative, or server-validated;
- do not add a second static "what happens next" / checkout-step explainer beside the cart when the checkout flow itself owns those steps;
- do not render `commerce.fulfillment-summary`, `commerce.documents-center`, `commerce.product-documents`, `commerce.downloads-tile`, or `commerce.post-purchase-guidance` on cart pages;
- physical/digital fulfillment may be shown at the actual cart-line level when it materially helps identify the item, but must not create a detached full-width cart section;
- public product documents belong on the PDP;
- purchased digital assets and account-only documents belong under `Fiókom → Letöltéseim`;
- stock, price, eligibility, MOQ/order-multiple and final-order validation remain mandatory runtime/server responsibilities even when explanatory chrome is absent.

The shared cart normalizer applies this contract to persisted drafts and template packages, and the template catalog validates the normalized result. New Template Factory output must satisfy the same contract before acceptance.
