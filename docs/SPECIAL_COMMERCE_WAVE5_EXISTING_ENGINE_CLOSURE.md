# Special Commerce Wave 5 — Existing Engine Closure

## Purpose

Wave 5 closes the launch gaps of the already accepted shared commerce engines instead of creating parallel engines. It hardens and connects E3 Guided Finder, E4 Multi-Product Composer, E5 Product Configurator, E6 Compatibility and the existing E7 structured-product evidence into the Visual Builder, storefront runtime, cart, checkout and historical order surfaces.

Wave 5 remains stacked on **Wave 4 — Room / Scene Composer specialization**. It must stay a Draft PR and does not authorize a `main` merge, production deployment or production database mutation.

## Reuse-first authority model

Wave 5 does **not** create a new:

- catalog authority;
- pricing engine;
- stock/inventory authority;
- checkout engine;
- payment engine;
- refund authority;
- compatibility inference engine;
- media engine.

Current catalog/channel/price/stock evidence is projected from the existing tenant-scoped catalog authority. Product attributes are read only from explicit merchant data in `product_attributes`; no attribute is inferred from product text, image, category or model output.

The existing non-3D product-media presentation path (`product_media_presentations` + shared product media rendering) remains the accepted media foundation. Wave 5 does not duplicate it.

## Engine configuration authority

`storefront_commerce_engine_configs` stores tenant-scoped, versioned configuration documents for:

- `guided_finder`;
- `multi_product_composer`;
- `product_configurator` (including explicit E6 compatibility rules).

The table is server-only:

- RLS enabled;
- no `anon` / `authenticated` table access;
- `service_role` may read;
- direct `service_role` DML is revoked;
- writes go through scoped save/delete RPCs;
- save/delete require `can_manage_catalog(instance_id, actor)`;
- SECURITY DEFINER routines use an empty `search_path` and are not browser-executable.

The application injects the current tenant id server-side and runs the canonical E3/E4/E5/E6 validators before save.

## Merchant and Builder UX

The merchant receives a dedicated **Finder / Composer / Configurator** library under Content management. The library exposes normal form controls rather than raw JSON.

The Visual Builder stores only the stable engine key on the component and binds the full configuration/catalog from the shared runtime context. Managed keys are:

- `finderKey`;
- `composerKey`;
- `configuratorKey`.

These keys are deliberately excluded from generic structured editing and are changed only through the dedicated commerce control. Builder, preview and published storefront use the same Page Schema renderer and the same runtime binding source.

## E3 Guided Finder closure

The storefront now executes the existing deterministic Guided Finder engine with merchant-configured questions/rules and explicit catalog attributes.

Candidates are tenant-scoped real product/variant records with current channel, stock and eligibility evidence. Finder recommendations do not create price, stock or purchase authority.

## E4 Multi-Product Composer closure

The existing Composer engine remains `shoporation.multi-product-composer.v1` and keeps its accepted rules:

- pool and slot modes;
- global and slot min/max constraints;
- duplicate limits;
- explicit catalog eligibility;
- no silent replacement;
- display subtotal is non-authoritative;
- eligibility/channel/price/stock are revalidated at checkout authority.

A valid composition creates grouped cart lines with a stable `compositionId`. Grouped lines have their own stable cart `lineId`, so a normal line and a grouped line for the same variant cannot silently merge.

## E5 Configurator + E6 Compatibility closure

The storefront executes the existing Product Configurator and Compatibility engines with explicit slot selection and explicit structured compatibility evidence.

A key fail-closed correction is part of Wave 5:

> an empty compatibility-rule set is `unknown`, never `compatible`.

`unknownCountsAsCompatible` therefore remains false in practice as well as in the declared E6 contract. A configuration cannot be added as ready while required compatibility evidence is unknown or incompatible.

## Group identity through cart and checkout

Wave 5 upgrades local cart persistence to preserve composition/configuration metadata while maintaining compatibility with existing cart data.

The quote path remains deliberately unchanged in authority: duplicate cart lines are aggregated by variant and sent to `quote_tenant_checkout_v2` as variant + quantity only.

Group metadata is sent only at authoritative order commit.

## Provider-neutral checkout v6 wrapper

`place_order_provider_v6_idempotent` is a **thin metadata wrapper** around the existing authoritative `place_order_provider_v5_idempotent`.

V5 remains responsible for:

- tenant/orderability checks;
- channel visibility;
- B2C/B2B price selection;
- stock validation and decrement;
- quantity rules;
- coupon validation;
- shipping amount;
- order creation;
- order lines;
- request idempotency.

V6 only:

1. validates and deterministically normalizes composition/configuration group metadata;
2. rejects grouped quantity allocation that exceeds the submitted cart quantity for a variant;
3. calls V5;
4. persists group identity against the real V5 order and real V5 order-item rows in the same database transaction;
5. binds replayed requests to the same normalized group fingerprint.

A replay with different group metadata fails closed. A legacy V5 replay cannot silently acquire new non-empty group metadata.

## Tenant-safe historical grouping

Wave 5 adds:

- `order_commerce_group_requests`;
- `order_commerce_groups`;
- `order_commerce_group_items`.

Composite foreign keys bind group rows to the same tenant/order and group items to the same tenant/order/order-item. A composition/configuration never becomes a synthetic SKU.

The customer order-detail page renders the preserved group read model from authoritative historical order lines. The model exposes `refundableLineIds` as the actual `order_items.id` values belonging to the group.

Refund/return behavior remains line-level under the existing return/refund authority. Wave 5 only preserves and presents grouping evidence; it does not invent a bundle refund engine.

## Checkout recovery

Authenticated checkout recovery preserves:

- the real variant id;
- quantity;
- stable cart line id;
- composition/configuration metadata.

Restore is tenant-scoped and rebuilds current cart rows from current tenant product/variant data. Current prices are not trusted from the saved recovery payload.

## Customer baseline

Source migration:

`supabase/migrations/20260913062000_special_commerce_existing_engine_closure.sql`

Customer forward migration:

`supabase/customer-baseline/migrations/0023_special_commerce_existing_engine_closure.sql`

The two files must remain byte-identical.

The customer-baseline manifest remains `snapshot-reviewed` with `freshInstallProofRequired: true` and no proof hash. The old proof cannot be reused because the ordered baseline contract changed through migration 0023. A real empty-target Fresh Install proof is still required before this can be called PASS.

## Acceptance gates

Code-level acceptance requires the exact Wave 5 HEAD to pass:

- dependency/security audit;
- customer-baseline guard;
- Block 24 contract gate;
- full quality tests;
- TypeScript;
- production build;
- release manifest;
- exact-head Vercel preview build.

Fresh Install may remain SKIPPED on the ordinary Wave branch and must not be reported as PASS.

After a green exact-head engineering gate, the migration may be applied to **staging only** for:

- RLS/grant/RPC verification;
- unauthorized config-write negative smoke;
- authorized Finder/Composer/Configurator save/delete smoke;
- V6 grouped-order transaction smoke and idempotency checks;
- FK index coverage;
- Supabase advisor review.

Production remains read-only evidence only until explicit release authorization.

## Explicit non-scope

Wave 5 does not add:

- virtual bundle SKUs;
- package/fixed-price authority;
- a second checkout implementation;
- automatic product substitution;
- inferred compatibility or inferred product attributes;
- new refund accounting;
- payment-provider changes;
- AR/3D;
- production rollout;
- `main` merge.
