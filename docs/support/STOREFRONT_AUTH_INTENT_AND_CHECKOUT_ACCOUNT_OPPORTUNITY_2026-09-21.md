# Storefront Auth Intent + Checkout Account Opportunity Rule — 2026-09-21

Status: CANONICAL / REQUIRED

## 1. Preserve user intent

Successful authentication MUST return the customer to the intent that opened auth.

Examples:
- header Fiók action -> authenticate -> /fiokom;
- checkout account opportunity -> authenticate -> remain on the same checkout step;
- protected account deep link -> authenticate -> return to that deep link;
- recovery/invite -> full-page secure flow remains allowed.

Do not redirect every successful storefront login to /fiokom.

Canonical contract:

AUTH SUCCESS -> RETURN TO USER INTENT.

## 2. Popup-first storefront auth

Normal storefront login/registration should use the shared auth dialog when launched from an interactive storefront surface.

The shared dialog owns:
- modal semantics and dismissal;
- shared AuthForm behavior;
- caller intent / return target;
- template token inheritance.

Templates do not fork authentication logic.

Full-page /fiokom auth remains a valid fallback for:
- direct navigation;
- password recovery;
- invite/deep-link flows;
- environments where a modal cannot be restored safely.

## 3. Checkout opportunity, never checkout gate

Before final order submission, an unauthenticated customer may be offered:
- Bejelentkezés;
- Regisztráció;
- Folytatás vendégként.

Guest checkout MUST remain available when commerce policy allows it.

Authentication inside checkout MUST NOT clear or recreate:
- cart;
- address fields;
- shipping choice;
- payment choice;
- coupon;
- note;
- current checkout step.

Canonical contract:

CHECKOUT AUTH IS OPTIONAL — NEVER BLOCK GUEST CHECKOUT.

AUTH DURING CHECKOUT MUST PRESERVE THE COMPLETE CHECKOUT STATE AND RETURN THE CUSTOMER TO THE SAME STEP.

## 4. Benefit claims are capability-aware

Only advertise benefits that the tenant/platform can actually provide.

Examples:
- loyalty copy only when the loyalty program is enabled;
- digital-download copy only when the basket contains digital content;
- tracking language must be conditional on tracking data being available;
- order history and return/case management may be shown when those shared account capabilities exist.

## 5. Account navigation

Authenticated desktop account navigation has one canonical authority: the left capability rail.
Do not reintroduce the legacy horizontal account subnav above or below account content.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
