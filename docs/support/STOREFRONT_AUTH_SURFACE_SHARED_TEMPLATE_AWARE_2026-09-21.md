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
