# Loot Vault v2 — Mobile Product Owner audit

Date: 2026-09-29
Branch: `feature/loot-vault-v2-visual-first-implementation`
Audit baseline HEAD: `723f0282830da403cd4ee0e7abb328b2cb1cfe93`

## Scope and acceptance state

The Product Owner completed the first visual + functional audit on mobile. Desktop/tablet remain automated-proof-only until a larger device is available. The overall visual direction is accepted subject to the defects below. No main merge is authorized.

## Resolution state — repository follow-up

Status authority for the continuing audit; do not restart these items from zero.

- **CODE / REGRESSION CLOSED:** deliberate 2-column mobile Universe browsing; mobile Catalog hero containment; functional Catalog/product routing; brand-relevant About content; expanded interactive FAQ; compacted Contact with accepted map/Form Wizard; detailed Returns flow; actionable account IA with distinct Wishlist and **Gyűjteményem** semantics; distinct Terms/Privacy/Imprint starter documents; separate canonical Shipping and Payment routes; product variant/demo binding with live price/stock identity; authoritative E13 quote path and stable fail-closed submit contract.
- **BROWSER PROOF PENDING:** the complete P0 shopper journey and the 14×3 Desktop/Tablet/Mobile fidelity matrix. Current Factory work must prove these on the exact #469 HEAD before Product Owner closure.
- **VISUAL OPEN:** cross-page media diversity/quality. The current asset pool contains repeated physical imagery; filename aliases or borrowing another template's media do not count as a fix.
- **PO-DEFERRED BY DESIGN:** demo-content activation/cleanup semantics remain intentionally deferred until the Product Owner defines deletion/edit-preservation behavior before activation implementation.
- **MERGE / GOLDEN:** still prohibited until Product Owner approval.

## Global P0 — commerce must be demonstrably functional in template preview

The storefront showroom may not be a static mock. It must demonstrate the shared commerce journey without creating a real order:

1. product variant selection changes selected state and authoritative demo price/stock;
2. add-to-cart uses the shared cart state;
3. mobile add-to-cart acknowledgement offers **Kosár megnyitása** and **Tovább vásárolok**;
4. cart supports quantity increase/decrease and item removal;
5. cart empty state is real;
6. checkout reads the same cart, exposes interactive shipping/payment demo choices and recomputes the total;
7. final order submission is explicitly fail-closed in showroom mode;
8. Factory proof must exercise the interaction chain, not only component presence.

Published runtime commerce authority remains shared platform authority. Do not create Loot Vault-specific order, payment, cart, pricing or inventory engines.

## Global UI

- Header utility icons must be canonical and visually consistent on every page: Favorites, Account, Cart.
- Avoid Unicode-glyph drift for semantic storefront actions.

## Home

- Current media is too repetitive/generic versus approved Visual First direction; replace with stronger, more varied collector/editorial/fantasy/sci-fi/gaming imagery.
- Universe rail feels like an uncontrolled filmstrip; use a deliberate mobile browsing pattern rather than an endless-looking strip.
- Dead CTAs must navigate.
- Product cards need a real shopper journey. Where variant choice is required, CTA should open the product page rather than pretend a direct add-to-cart is safe.

## Catalog

- Mobile hero heading currently overflows the viewport; retain the editorial scale but keep the full title visible.
- Product grid layout is accepted.
- Product cards require a visible CTA / product route.

## Vault Magazine

- Layout accepted; media quality/diversity must be raised to approved Visual First quality.

## About

- Remove generic system/process tiles such as “Valódi termékadat / Történetközpontú bemutatás / Egységes vásárlási folyamat”.
- Replace with brand-relevant About content: who the shop is, what it curates, collector point of view, and trust proposition.
- Prefer natural Hungarian wording such as “valós termékadatok”; “valódi termékek, valós adatok” when that distinction is intended.

## FAQ

- Expand the number of useful questions/answers.
- Use a real accordion/disclosure interaction.
- Keep “Nem találtad a választ?” copy and Contact CTA in one coherent block.

## Contact

- Map, address, hours/company details and Form Wizard are accepted.
- Keep quick routes, but compact them.
- Remove explanatory filler tiles (“Add meg a rendelési számot”, “Követhető ügyfélszolgálati ügy”, “Fiók és GYIK”).

## Returns

- Remove generic repeated filler blocks and oversized generic “Hasznos oldalak” treatment.
- Add a detailed return flow: eligibility, deadlines, packing, shipping-cost responsibility, refund timing, damaged/defective goods, tracking.
- End with a focused Return/Contact Form Wizard CTA.

## Account

- Overall account layout accepted.
- B2B capabilities (quotes/company flows) only appear when B2B capability + user authorization are active.
- Every account item must navigate to a real subroute or show a useful empty state. Visual-only buttons are forbidden.
- Wishlist/heart and collection concepts must not be conflated. Proposed Loot Vault-specific customer value: **Gyűjteményem** tracker with 2 tiles/row on mobile, owned items normal, missing/acquirable items subdued, optional filters for large catalogs, image/name only, click through to product page. No price/add-to-cart is required on this tracker surface.

## Legal and purchasing information

- Terms, Privacy and Imprint must not be the same card layout with renamed headings.
- Each requires its own document-type-specific template text and structure with merchant placeholders.
- Shipping and Payment are two separate information pages and canonical storefront routes: `/szallitas` and `/fizetes`. The legacy combined route may exist only as compatibility/redirect behavior.
- Legal template copy is starter content, not guaranteed merchant-specific legal advice.

## Product page

- Variant controls must actually select variants and update price/stock/identity.
- Product description must be meaningfully longer than the current one-line placeholder.
- Product data/story blocks may remain, but should use real product-context copy.

## Demo-content activation rule — revisit before activation implementation

The merchant may optionally install demo content. Before the merchant explicitly opens/publishes the webshop, show a confirmation explaining that demo content marked for cleanup will be removed. Before implementing that activation step, return to the Product Owner and define precisely which demo artifacts are deleted, which authored/template structures remain, and how merchant-edited demo content is treated. Do not silently delete content.
