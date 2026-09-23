# Storefront Authentication Intent + Checkout Account Opportunity — 2026-09-21

Status: CANONICAL / REQUIRED

Scope: shared storefront customer authentication, account navigation, checkout auth opportunity and authenticated guest-order claiming.

## 1. Shared behavior, template-owned presentation

Canonical invariant:

SHARED AUTH BEHAVIOR + TEMPLATE-OWNED AUTH PRESENTATION

Normal storefront login and registration launched from interactive storefront UI use the shared `StorefrontAuthDialog`. Templates may supply inherited design tokens and composition, but must not fork authentication business logic.

Invite, password recovery and URL/session-bound special flows may remain full-page fallbacks.

### Product Owner preview access is not shopper authentication

The representative Product Owner template preview is a read-only platform review surface. A Vercel-protected preview share must open the requested template directly and must not route the reviewer through the customer `/fiokom` login surface.

Canonical separation:

- Product Owner preview access = preview/deployment protection;
- merchant/platform admin authentication = admin authority;
- shopper account authentication inside a rendered storefront = shared `StorefrontAuthDialog` with the active template design tokens.

Never use the customer account page as the access gateway for a Product Owner template share. This conflates platform review identity with shopper identity and destroys template-owned auth presentation before the template is rendered.

Template Factory browser QA must actively open the canonical account auth trigger for each selected template and prove that the dialog opens in-place, inherits the template CSS token set and preserves the shared mobile no-wrap/touch-target auth invariants.

The dialog must use native dialog semantics, modal background blocking, keyboard operation, ESC dismissal, explicit close affordance, focus entry and focus restoration.

Mobile auth tabs are a shared presentation invariant: **AUTH TAB LABELS MUST NEVER WRAP**. `Bejelentkezés` and `Regisztráció` remain two equal-width tabs, keep at least a 44px touch target, use `white-space: nowrap`, and adapt typography/padding before any label is allowed to wrap. The contract is intended to remain safe at 320 / 360 / 390 / 430px viewport widths.

## 2. Authentication preserves user intent

Canonical invariant:

AUTH MUST PRESERVE USER INTENT — NEVER REDIRECT TO ACCOUNT BY DEFAULT UNLESS ACCOUNT WAS THE INTENDED DESTINATION.

The only redirect authority for storefront customer auth is `normalizeStorefrontReturnTarget` / `storefrontAuthHref`.

Allowed targets are same-origin relative paths beginning with one `/`. Reject:
- absolute external URLs;
- protocol-relative `//...` targets;
- backslash-based host confusion;
- control characters;
- protocol schemes such as `javascript:`, `data:`, `http:` or `https:`.

Examples:
- header Fiók action -> authenticate -> `/fiokom`;
- protected `/fiokom/visszakuldes` -> middleware -> `/fiokom?next=...` -> authenticate -> exact protected route;
- wishlist action -> shared modal -> successful auth -> original wishlist form resumes on the product surface;
- checkout auth -> callback completes inside the mounted checkout without account redirect.

Registration e-mail confirmation uses the same validated return target when one exists.

## 3. One account navigation authority

Desktop customer account uses:

ONE CANONICAL LEFT ACCOUNT CAPABILITY RAIL

`AccountSubnav` is retained only as a component name for compatibility; rendered markup authority is `accountCapabilityRail` / `platform-ia`. Do not reintroduce the historical horizontal `accountSubnav` UI.

Tablet/mobile may responsively collapse the same capability source; they must not create a second navigation registry.

## 4. Checkout auth is optional

Canonical invariant:

CHECKOUT AUTH IS OPTIONAL — NEVER BLOCK GUEST CHECKOUT.

Before final submission a signed-out customer may choose:
- Bejelentkezés;
- Regisztráció;
- Folytatás vendégként.

The opportunity is informational, not a validation gate. Dismissing it must not disable order submission.

## 5. Checkout state preservation

Canonical invariant:

AUTH DURING CHECKOUT MUST PRESERVE THE COMPLETE CHECKOUT STATE AND RETURN THE CUSTOMER TO THE SAME STEP.

The modal is mounted inside the existing `CheckoutForm`; successful login/register uses a callback and does not navigate to `/fiokom`. Therefore the canonical checkout state owner remains the existing checkout component/cart authorities. Do not introduce an auth-specific duplicate checkout store.

The following state remains owned by the existing checkout/cart flow:
- cart and quantities;
- coupon;
- contact, billing and shipping fields;
- shipping method and parcel point;
- payment method;
- legal selections;
- active accordion step.

## 6. Capability-driven benefit messaging

Marketing claims in the checkout opportunity must be derived from actual capabilities.

Current canonical resolver: `resolveCheckoutAccountBenefits`.

Examples:
- loyalty only when `loyalty_program_settings.enabled` is true;
- order history only when the tenant has effective `orders` entitlement;
- return/case benefit only when effective `returns` entitlement is enabled;
- digital downloads only when the platform capability is available and the current basket actually contains digital lines.

Do not advertise saved addresses, tracking, loyalty, downloads, returns or another feature merely because the copy sounds useful.

## 7. Post-purchase second chance

A guest order confirmation may offer account creation or login.

Canonical security invariant:

GUEST ORDERS MUST NEVER BE ATTACHED TO AN ACCOUNT BASED ON EMAIL MATCH ALONE.

The shared `claim_guest_order_v1` authority requires all of:
- tenant scope;
- server-issued order confirmation token;
- authenticated customer ID;
- authenticated account e-mail matching the checkout e-mail;
- order still unclaimed, or already claimed by the same customer.

A successful claim updates order ownership, synchronizes digital entitlement ownership and revokes guest digital access tokens. A different authenticated account cannot steal an already claimed order.

## 8. Defect classification and prevention

For every auth/account/checkout defect, classify first:

LOCAL PRESENTATION DEFECT vs SHARED INVARIANT DEFECT.

Canonical engineering rule:

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE

Do not fix shared failures with:
- Playroom-only CSS;
- Playroom-only redirect routes;
- template-specific auth business logic;
- a second return/redirect validator;
- an auth-specific checkout state store;
- email-only guest-order linking.

## 9. Quality Gate coverage

Template Factory Quality Gate v2 must trigger on shared auth redirect authority, auth modal, checkout opportunity, post-purchase claim API/migration and relevant account/checkout files.

Contract regression suite includes:
- auth modal structure/accessibility source contract;
- safe return-target unit tests including open-redirect rejection;
- protected account intent preservation;
- wishlist auth continuation;
- optional guest checkout;
- capability-driven benefit resolver;
- one account navigation authority;
- authenticated token-bound guest-order claim and baseline migration parity.

Exact-head CI/QG evidence remains required before acceptance is marked PASS.
