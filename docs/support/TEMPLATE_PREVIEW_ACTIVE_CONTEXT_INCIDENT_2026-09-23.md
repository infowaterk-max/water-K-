# Template Preview active-context incident — 2026-09-23

## Incident

During Loot Vault Product Owner visual acceptance, opening the exact Vercel Preview URL and then navigating directly to `/storefront-template-preview` produced the generic transient-error surface.

Runtime evidence on the exact deployment showed:

`Nincs aktív webshop kontextus.`

The user was authenticated, but the direct preview route had no selected merchant tenant.

## Root cause

`storefront-template-preview/page.tsx` required all three of these in sequence:

1. authenticated admin;
2. `contentMarketing` plan feature;
3. `requireCurrentStoreContext('store.manage')`.

That is correct for a merchant entering from the Builder, but incorrect for platform-level template acceptance: a platform owner/admin/operator may review a representative, non-installing template package without selecting a merchant tenant first.

The route therefore converted a missing context into an application error instead of a controlled access decision.

## Resolution

A dedicated template-preview entry guard now:

- always requires authenticated admin access;
- uses the normal current-store context and `contentMarketing` entitlement when a merchant context exists;
- only in Vercel Preview, allows an authenticated platform operator to review the representative template without tenant context;
- redirects non-platform users without context to the existing access-denied route instead of throwing;
- does not change production storefront access, tenant mutation authority, Builder persistence, installation authority or pilot publication state.

## Prevention contract

1. Representative template review and merchant-template installation are separate authorities.
2. Platform template acceptance may be tenantless only in Preview and only for authenticated platform operators.
3. Merchant template preview remains tenant- and entitlement-aware.
4. Missing tenant context in a page-entry guard must resolve to an explicit access state, not a generic application error.
5. Exact-link Product Owner acceptance must be tested from a fresh authenticated session, not only from an already-open Builder context.
