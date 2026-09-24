# Storefront Auth Surface — shared template-aware login

Date: 2026-09-21

## Classification
Shared invariant / missing shared storefront capability. Do not solve per-template with local login pages.

## Canonical repair path
1. Shared customer auth behavior remains in `AuthForm`.
2. Anonymous `/fiokom` resolves the active storefront account Page Schema instead of bypassing the storefront shell.
3. `StorefrontAccountShell` renders the active template header/footer for signed-out customers and suppresses authenticated account navigation.
4. Auth presentation inherits the active template design tokens (`--shoporation-*`), so Playroom renders as Playroom and future templates inherit their own visual DNA without duplicating auth logic.
5. Login, registration, password reset and invite/recovery remain one shared functional implementation.
6. Desktop and mobile share the same auth primitive; mobile receives responsive full-surface treatment.
7. Regression authority: `tests/storefront-auth-surface.test.ts` plus Template Factory Quality Gate v2.

## Regression rule
If a later template shows the generic legacy auth appearance, classify it first as a shared auth-shell/token-inheritance regression. Do not patch that template locally unless the shared contract is proven correct and the defect is genuinely template-specific.

## Security boundary
This change is presentation/composition only. It does not replace Supabase authentication, authorization, tenant checks, password recovery, invite flow, or safe redirect handling.

## Playroom acceptance
Playroom is the reference implementation for human visual acceptance. Its signed-out account entry must use the Playroom header/footer and Playroom design tokens. The old generic beige storefront login is not an accepted Playroom state.


## Template Factory preview extension — 2026-09-23
The original shared auth invariant covered active/published storefront runtime only. Template Factory Product Owner preview is tenant-independent, so routing preview authentication through `/fiokom` lost the candidate template identity and could fall back to the active storefront or generic auth surface.

Canonical extension:
1. Product Owner preview authentication carries `templateKey/templateVersion` explicitly.
2. `StorefrontAccountShell` can resolve the requested template account runtime directly from the template package without an active webshop instance.
3. The preview login route uses the same shared `AuthForm` behavior inside that template-owned account composition.
4. Preview authentication is login-only; it must not offer customer registration.
5. `requireAdmin` routes `/storefront-template-preview` authentication to the template-aware preview login entry, never to generic `/fiokom`.
6. Regression authority must cover the full template catalog, not only Playroom or an installed tenant.

This is a shared Factory/runtime invariant. A future template-specific auth mismatch is a release-blocking shared regression, not a local polish item.
