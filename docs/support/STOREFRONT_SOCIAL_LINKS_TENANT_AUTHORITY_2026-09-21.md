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
- X
- Twitch
- LinkedIn
- Pinterest

Do NOT use e-mail Brand Kit social data as storefront authority.
Do NOT hardcode tenant social URLs inside templates.

## Runtime contract

The storefront runtime resolves configured social URLs into `brand.socialLinks`.

Templates may own only presentation. Functional behavior is shared through:
- `system.social-links`

The shared primitive:
- renders semantic external links;
- supplies accessible labels;
- uses only validated HTTPS URLs on the selected provider's own domain;
- opens external destinations safely;
- returns no output when no valid profile is configured.

Therefore, when a merchant has no social profiles configured, the complete social block — including headings such as “Kövess minket” — disappears instead of leaving an empty or fake control.

## Write contract

Merchant mutation requires `store.manage` on the server and is persisted through:
- `admin_mutate_storefront_social_links_v1`

The database RPC independently checks `can_manage_storefront(instance, actor)`, validates the provider allowlist, HTTPS requirement and provider-owned domain, preserves unrelated storefront configuration and writes audit evidence.

No direct browser/table mutation is authoritative.

## Template acceptance rule

A template MUST NOT:
- ship decorative characters pretending to be social icons or ambiguous unlabeled glyphs;
- use `#` placeholder destinations;
- keep an empty social section visible;
- own merchant URLs in template source.

A template MAY:
- style the shared social component;
- choose placement, spacing, icon treatment and responsive composition.

Preview/demo data MAY show representative social controls, but those links must also be real HTTPS destinations rather than `#` placeholders. Production remains tenant-owned only.


## Responsive style inheritance rule

A shared storefront/footer repair MUST respect the responsive style shape used by the Visual Builder Runtime.

When a node stores visual values as `style: {base:{...}, tablet:{...}, mobile:{...}}`, a runtime normalizer MUST patch the effective `base` style instead of writing only sibling top-level keys such as `style.minHeight`, `style.padding` or `style.fontSize`. Top-level patches can look correct in Page Schema inspection while being ignored by `resolveStorefrontVisualStyle()`, causing Builder/preview/storefront divergence.

Regression evidence for this defect class must verify the rendered Runtime, not only the normalized JSON. For the Playroom footer the accepted desktop evidence includes:
- footer `min-height: 13.5rem`;
- footer `padding: 1.75rem 2.35rem 2rem`;
- navigation font floor `.86rem`;
- navigation item minimum height `2.1rem`.

Classification: shared invariant / responsive style inheritance. Do not repair this page-by-page or template-page-by-template-page.

ONE DEFECT -> ONE SHARED FIX -> REGRESSION TEST -> QUALITY GATE.
