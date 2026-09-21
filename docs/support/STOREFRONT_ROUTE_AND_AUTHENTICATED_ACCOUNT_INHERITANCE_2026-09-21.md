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

## 4. Customer account browser grants

RLS policy existence is not sufficient by itself. Customer-session tables must also expose the minimum table privileges required for those policies to execute.

Required customer browser grants:
- profiles: SELECT plus UPDATE only on full_name, company_name and tax_number;
- wishlists: SELECT for owner-scoped account reads.

Anonymous access remains revoked. Write paths that already use server-only/admin authority must not be broadened merely to silence an account-page error.

If the account overview shows a partial-load warning while individual downstream sections still appear populated, inspect table/column grants before assuming the data itself is missing.

## 5. Mobile customer order history

Customer-facing order history must not rely on a desktop-width table on narrow viewports.

Desktop may use the semantic table. Mobile must switch to semantic order cards with the same authoritative order data. Horizontal scrolling is not the accepted primary mobile presentation for the account overview.

## 6. Single account navigation authority

The live customer account shell must render exactly one account navigation.

Authority:
- capability list: `resolveAccountCapabilities()`;
- live renderer: `AccountSubnav`;
- template: visual tokens only.

A Page Schema `account.capability-navigation` node may exist for Builder/template composition, but the live account shell must not render it in parallel with `AccountSubnav`. Rendering both creates repeated navigation before, inside or after the account content, especially on mobile.

Acceptance:
- one `Fiók navigáció` landmark;
- no repeated Áttekintés / Rendeléseim / Letöltéseim group;
- mobile uses one compact scrollable navigation row;
- desktop may present the same authority as a sidebar.

## 7. Public information vertical rhythm

System information pages must use one shared vertical stack contract between cards, feature panels and action groups. Adjacent rounded surfaces must not visually touch or overlap.

The shipping fallback must also remain useful when no carrier is configured: explain checkout selection, final fee visibility and post-order tracking availability without inventing carrier names, delivery times or unsupported promises.

## 8. Public returns information vs authenticated return workflow

The public `/oldal/visszakuldes` page is informational. It explains the process, points to the applicable terms and hands operational work to the authenticated return center.

The authenticated `/fiokom/visszakuldes` page remains the only customer workflow authority for:
- choosing an eligible order;
- choosing order items and quantities;
- submitting a reason/note;
- tracking return-case status;
- viewing refund information when available.

The public page MUST NOT duplicate the mutation workflow or hardcode legal deadlines that may depend on the transaction, customer type or applicable terms.

Acceptance contract:
PUBLIC GUIDANCE + AUTHENTICATED OPERATIONAL WORKFLOW + ASZF AUTHORITY.

## 9. FAQ authority and template inheritance

The public `/gyik` route is a shared storefront system surface and MUST inherit the active template shell and design tokens.

Authority order:
1. published merchant CMS page with slug `gyik`, when present;
2. otherwise the shared system FAQ fallback.

The shared fallback may derive current shipping modes, payment modes and free-shipping threshold from `getCommerceSettings()`. It must not hardcode provider names that are not active for the tenant.

The FAQ must remain informational:
- no mutation or checkout behavior lives inside FAQ;
- returns hand off to the authenticated return workflow;
- shipping/payment answers link to their dedicated system pages;
- merchant-authored CMS content may replace the fallback without losing template inheritance.

Acceptance contract:
ACTIVE TEMPLATE SHELL + MERCHANT CMS OVERRIDE OR CONTEXTUAL SYSTEM FALLBACK.

## 10. Catalog discovery links and template inheritance

Footer or navigation discovery entries such as `Újdonságok` may represent a catalog query state instead of a separate CMS page.

Canonical example:
- `/webaruhaz?sort=new` = newest-first catalog discovery.

Rules:
- do not duplicate the catalog into a template-local `/ujdonsagok` content page only to change the heading;
- the catalog route MUST remain inside the active storefront template shell;
- URL filter/sort state MUST remain functional;
- the route may adapt its heading and supporting copy to the query intent;
- prices, stock, audience and ordering remain shared commerce authority;
- template ownership is presentation/shell, not duplicated catalog business logic.

Acceptance contract:
ACTIVE TEMPLATE SHELL + SHARED CATALOG CORE + URL DISCOVERY STATE.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
