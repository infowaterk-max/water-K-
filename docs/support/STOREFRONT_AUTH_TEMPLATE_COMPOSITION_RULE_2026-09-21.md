# Storefront Auth Template Composition Rule — 2026-09-21

Status: CANONICAL / REQUIRED
Scope: all Storefront templates, current and future

## Non-negotiable invariant
SHARED AUTH BEHAVIOR + TEMPLATE-OWNED AUTH COMPOSITION/PRESET.

Token recoloring of one generic auth card is NOT template-specific acceptance. Every accepted template MUST provide an Auth/Account signed-out composition that visibly belongs to that template's Visual DNA on desktop, tablet and mobile.

## Shared authority
The shared auth primitive owns login, registration, password recovery, invite/recovery completion, validation/error/loading states, Supabase auth calls, safe redirects and authz boundaries. Templates MUST NOT fork these behaviors.

## Template authority
Each template owns the signed-out account composition/preset: template header/footer; layout, spacing, surfaces, typography and hierarchy; auth framing/supporting content; responsive composition; and template-specific visual language beyond color-token substitution. The shared AuthForm is mounted inside that template-owned composition.

## Signed-out invariant
When customerId is null:
- account.capability-navigation MUST NOT render;
- fallback authenticated account navigation MUST NOT render;
- authenticated account shortcuts MUST NOT precede or surround auth;
- only public/template auth composition may render.

## Closed storefront invariant
Customer auth entrypoints remain reachable even when catalog/checkout are closed. This does NOT grant catalog, checkout, admin or merchant access. Closed-storefront routing must never create /hamarosan -> /fiokom -> /hamarosan loops.

## Acceptance gate
A template cannot reach final human visual acceptance unless:
1. signed-out /fiokom renders its own template Auth preset;
2. shared auth behavior remains shared;
3. no authenticated account navigation leaks while signed out;
4. desktop/tablet/mobile are visually accepted;
5. Builder/Preview/Storefront use the same canonical composition authority;
6. regression tests cover the signed-out invariant;
7. generic beige/default fallback is absent from the accepted path.

For the remaining template portfolio this rule is mandatory from first acceptance; do not rediscover or repair it template-by-template.

## Defect policy
Generic auth, authenticated navigation while signed out, or a closed-storefront auth loop is a shared invariant/composition-contract failure first.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
