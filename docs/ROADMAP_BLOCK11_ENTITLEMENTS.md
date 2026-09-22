# Roadmap Block 11 — Basic / Pro / Add-on entitlement system

## Scope

Block 11 consolidates the already accepted Shoperation package model without changing pricing or introducing a new package tier. Persisted plans remain `alap` and `pro`. A capability may instead be granted temporarily by a Business Pulse trial, separately by an Add-on, or explicitly by a platform/operator exception. Technically implemented but unreleased capabilities remain reserved and fail closed.

This block does not implement Page Schema/Templates or the Visual Builder. Existing admin/storefront configuration stays Builder-ready through centralized capability contracts rather than component-level package hardcoding.

## Effective entitlement precedence

Reserved or unknown capability is an absolute deny. For released capabilities the winning active candidate is resolved in this order:

1. `platform`
2. `manual`
3. `trial`
4. `addon`
5. `plan`

Within the same source, instance scope wins over organization scope, then the most recently updated row wins. A higher-priority `enabled=false` row is an explicit revoke. Expired candidates no longer participate, so the next valid lower-priority entitlement becomes effective.

## Packages

`Alap` and `Pro` use catalog-backed plan-to-capability grants. `Pro` inherits all released Alap capabilities plus the currently released advanced capabilities. `teamChatSecureAttachments` and `apiAccess` are reserved and are not granted by Alap, Pro, Trial, Add-on, or platform override.

A trial never mutates the persisted plan and never creates a hidden permanent Pro upgrade.

## Add-ons

Add-ons are separate entitlements, not an additional package tier and not automatic Pro inheritance. Their compatibility is catalog-driven. Enabling an Add-on requires compatibility with the tenant's persisted plan. Disabling remains possible after downgrade.

An incompatible Add-on after a plan downgrade loses its derived effective entitlement, but its `webshop_instance_addons` configuration row is preserved. No destructive downgrade is introduced.

## Downgrade and expiry

Plan sync deletes and rebuilds only derived `source='plan'` rows. Add-on sync deletes and rebuilds only derived `source='addon'` rows. Business/configuration data is not deleted. Trial/manual/platform records are not deleted by plan changes. Expiry and explicit revocation stop new capability use while allowing preserved configuration to be resumed after a later compatible reactivation.

## Enforcement

The database resolver and server-side access layer both enforce release state, source precedence, expiry, tenant scope, and explicit revocation. Admin navigation discovery uses effective feature entitlements instead of inferring Pro access from platform role or trial branding. Unauthorized users cannot gain capability access from UI visibility.

Platform feature overrides and Add-on mutation are service-role-only and attributed to a real platform operator. Both append audit evidence. Reserved capabilities cannot be enabled through the override authority.

## Launch protections

Block 11 does not change Water-K from `pilot`, start a trial, activate an Office mailbox, configure DNS/MX/provider receiving, release Secure Attachments, expose `apiAccess`, create public attachment storage, or modify K&H/vPOS behavior.
