# Storefront Social Links Tenant Authority — 2026-09-21

Status: CANONICAL / REQUIRED
Scope: all storefront templates and merchant settings

## Authority

Social profile URLs are merchant-owned storefront configuration.

Canonical storage:
- `webshop_instances.storefront_config.socialLinks`

Canonical merchant surface:
- `/admin/beallitasok/megjelenes`

Supported profile keys:
- Facebook
- Instagram
- YouTube
- TikTok
- LinkedIn

Do NOT use e-mail Brand Kit social data as storefront authority.
Do NOT hardcode tenant social URLs inside templates.

## Runtime contract

The storefront runtime resolves configured social URLs into `brand.socialLinks`.

Templates may own only presentation. Functional behavior is shared through:
- `system.social-links`

The shared primitive:
- renders semantic external links;
- supplies accessible labels;
- uses only validated http/https URLs;
- opens external destinations safely;
- returns no output when no valid profile is configured.

Therefore, when a merchant has no social profiles configured, the complete social block — including headings such as “Kövess minket” — disappears instead of leaving an empty or fake control.

## Write contract

Merchant mutation requires `store.manage` on the server and is persisted through:
- `admin_mutate_storefront_social_links_v1`

The database RPC independently checks `can_manage_storefront(instance, actor)`, validates the provider allowlist and URL format, preserves unrelated storefront configuration and writes audit evidence.

No direct browser/table mutation is authoritative.

## Template acceptance rule

A template MUST NOT:
- ship decorative characters pretending to be social icons;
- use `#` placeholder destinations;
- keep an empty social section visible;
- own merchant URLs in template source.

A template MAY:
- style the shared social component;
- choose placement, spacing, icon treatment and responsive composition.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
