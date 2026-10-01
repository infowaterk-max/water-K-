# VX Blank Studio System Template

## Purpose

Blank Studio is the from-scratch creation surface for VX Shop Builder. It is deliberately not one of the curated 42 visual templates: the 42 remain the design portfolio, while Blank Studio is a system template for merchants, agencies and advanced users who want to compose their own design.

## Functional baseline

Blank Studio is visually minimal but not functionally empty. It ships the canonical 14-page matrix and uses the same Page Schema, component registry, Storefront Runtime, responsive authority, draft/publish lifecycle and installation flow as every curated template.

The Home page contains only a shared Header, one editable starter section and a shared Footer. Commerce-critical pages retain the smallest real shared components needed for an operational storefront: catalog/product/search surfaces plus cart and checkout summaries.

## Engines and capabilities

No optional engine is hard-coded into Blank Studio. Shop the Look / Interactive Scene, Finder, Configurator, Recipe Commerce and other shared capabilities are inserted through the normal capability-aware Builder Library. Their structure and business logic remain engine-owned; their presentation inherits Blank Studio Template DNA and may use the shared validated engineStyle color overrides.

## Design authority

Blank Studio starts with neutral global tokens: white surfaces, graphite text, restrained neutral borders and a modest warm accent. These are starter values, not a locked skin. The merchant can edit the global Template DNA and then optionally override semantic engine colors locally.

## Portfolio accounting

`STOREFRONT_TEMPLATE_LAUNCH_TARGET` remains 42 and curated `STOREFRONT_TEMPLATE_CATALOG` metrics exclude Blank Studio. Blank Studio lives in the separate system-template catalog, but joins the same resolvable/installable template set and merchant template library.

## Demo content

Blank Studio has no implicit demo products, collections or category-specific fixtures. Preview/demo helpers also avoid synthesizing category-specific product cards for it. The empty state is intentional.

## Non-negotiable rules

- no Blank-specific renderer, editor, persistence path or publication state;
- no template-owned Shop the Look or other engine fork;
- no hidden capability bypass;
- no implicit demo catalog;
- no reduction of the canonical 14-page matrix;
- no counting Blank Studio as a 43rd curated design template.
