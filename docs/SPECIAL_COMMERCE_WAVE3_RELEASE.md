# Special Commerce Wave 3 — Drop / Release Commerce

Canonical scope: a reusable release-state engine for accepted storefront templates such as `fashion.street-drop`.

## Authority

The shared engine owns only release scheduling (`starts_at`, optional `ends_at`) and explicit product/variant membership. It does not own or copy price, inventory, cart, checkout, order or payment state. Release state is derived server-side from the persisted window. A browser countdown is display-only and can never unlock commerce.

## Anti-fake rules

- no template-local scheduler;
- no hard-coded or merchant-entered stock count;
- no fake limited-stock claim;
- no fake countdown;
- no client-clock purchase unlock;
- no Page Schema release-state authority.

## Packaging

Street Drop was historically accepted with minimum plan `alap`, and its Release Bar is part of that accepted experience. Therefore `releaseCommerce` is an explicitly entitlement-gated feature granted to both Alap and Pro. Missing/revoked/error entitlement fails closed server-side.

## Compatibility

The existing Street Drop bindings remain valid:
- `inventory.releaseStatus` is populated by the shared engine;
- `catalog.drop` is populated only from a server-resolved live release;
- `catalog.limited` remains fail-closed until a genuine shared storefront scarcity/low-stock authority exists. Procurement `safety_stock_days` is not repurposed as a marketing threshold, and Wave 3 does not invent an arbitrary stock-count cutoff.

The new reusable `commerce.release@1` component can be placed by the Visual Builder with dedicated controls. Release definitions remain outside Page Schema in the merchant Release library.
