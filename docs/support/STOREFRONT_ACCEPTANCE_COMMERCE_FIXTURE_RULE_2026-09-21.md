# Storefront Acceptance Commerce Fixture Rule — 2026-09-21

Status: CANONICAL / REQUIRED
Scope: preview/staging acceptance tenants only

## Purpose

Acceptance must prove both empty and configured commerce states. A template is not sufficiently exercised when shipping and payment information pages only render their empty-state message.

## Representative configured state

The Digital Commerce Acceptance tenant uses a non-live representative fixture with:
- personal pickup;
- home delivery;
- parcel-point delivery;
- bank transfer;
- cash on delivery;
- a free-shipping threshold.

The fixture must exercise the same `getCommerceSettings()` / provider-connection path used by the storefront.

## Safety boundary

Acceptance fixtures MUST NOT:
- use production credentials;
- create a live card-payment connection;
- contain a routable real logistics e-mail;
- be installed through a production migration;
- silently become a merchant default.

External-logistics fixture routing uses the reserved `.invalid` domain.
Bank-transfer data is explicitly marked as non-live acceptance data.
The repeatable SQL lives under `supabase/acceptance/`, not `supabase/migrations/`.

## Runtime fallback

Preview may expose the same representative values as a deterministic safety fallback when the explicit acceptance provider rows are absent.

This fallback is allowed only when:
- `VERCEL_ENV === 'preview'`; and
- the tenant carries the explicit `storefront.acceptance === 'digital-commerce-guest-matrix'` marker.

Normal pilot and production tenants must remain fail-closed and must never inherit these values.

## Acceptance principle

TEST DATA MAY DIFFER FROM MERCHANT DATA.
RUNTIME BEHAVIOR, COMPONENT AUTHORITY, PROVIDER CONTRACTS AND TEMPLATE INHERITANCE MAY NOT.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
