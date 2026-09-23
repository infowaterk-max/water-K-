# Template Preview fixture media incident — 2026-09-23

## Context

Loot Vault passed the automated launch-quality matrix, but human review of the exact-head Catalog screenshot showed blank grey product media while Home and PDP previews had artwork.

## Root cause

The representative Preview generated generic product images only from image-bearing components on the currently rendered page. Home contained authored demo artwork, so its product cards received images. Catalog did not contain a local image-bearing component, therefore representative products degraded to `image:null`.

Product demo fixtures already represented the cross-page product identity, but Preview did not consume fixture-owned media.

## Resolution

The shared representative Preview now accepts `image`, `imageUrl` or `src` from product demo fixture payloads and prefers that media before page-local image fallbacks.

Loot Vault product fixtures now carry explicit representative artwork. This keeps Home, Catalog and other product-list surfaces visually coherent without inventing production product truth or adding hidden rendering nodes.

## Prevention contract

1. Representative product identity and representative product media should travel together in demo fixture authority.
2. Cross-page Preview quality must not depend on whether the current Page Schema happens to contain a local decorative image.
3. Do not add invisible components solely to seed Preview media.
4. Demo media is presentation-only and must never be treated as merchant catalog truth.
5. Product Owner visual review must include at least one listing page as well as Home/PDP before template acceptance.
