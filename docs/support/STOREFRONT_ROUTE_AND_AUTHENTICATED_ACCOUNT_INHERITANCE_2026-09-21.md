# Storefront Route Integrity + Authenticated Account Template Inheritance — 2026-09-21

Status: CANONICAL / REQUIRED
Scope: all current and future storefront templates

## Defect classes closed by this rule

### 1. Footer/internal route integrity

A storefront template MUST NOT expose an internal link that resolves to 404.

Stable system information links such as:
- /oldal/szallitas
- /oldal/fizetes
- /oldal/visszakuldes

must remain functional even when the merchant has not published a CMS override yet.

System fallback content must use live tenant commerce settings. Shipping and payment provider names, fees and availability must not be hardcoded into the template.

Merchant-authored CMS content may override the fallback when a published page exists.

### 2. Public information template inheritance

Public information routes must inherit the active storefront template shell and design tokens. A route is not accepted when the footer/header is template-specific but the linked information page falls back to unrelated generic beige/white chrome.

Contract:
SHARED INFORMATION BEHAVIOR + ACTIVE TEMPLATE SHELL/TOKENS + TENANT DATA.

### 3. Authenticated account template inheritance in preview

Signed-out and signed-in states are the same storefront surface.

In Vercel preview, the authenticated account MUST resolve the exact account draft for the active acceptance tenant just like the signed-out auth view. Authentication must not cause a transition from a template-owned Playroom surface to a generic fallback account UI merely because there is no published revision yet.

Customer-specific commerce data remains customer-scoped. Only the visual/page draft authority is shared.

## Classification rule

Before patching:
“Ez lokális hiba, vagy shared invariant sérülés?”

- 404 from a canonical template link = route-integrity invariant.
- signed-in state losing template inheritance = authenticated storefront-shell invariant.
- do not solve either defect page-by-page.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
