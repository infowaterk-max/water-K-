# Special Commerce Wave 4 — Room / Scene Composer specialization

## Canonical scope

Wave 4 specializes the already accepted `shoporation.interactive-scene-commerce.v1` foundation for **Shop the Room / complete-set commerce**. It does not create a second room engine, a second scene renderer, a bundle SKU authority, pricing engine, inventory engine or cart implementation.

The accepted Home/Living Pro promise is:

- Shop the Room / complete room composition;
- stronger real variant presentation for color/material/finish choices where the catalog actually supplies them;
- set shopping over the shared Multi-Product Composer;
- AR / room placement remains a separate post-launch premium capability and does not block Shoperation 1.0.

## Reuse boundary

Wave 4 composes two existing shared engines:

1. **Interactive Scene Commerce v1** — scene image, D/T/M hotspot geometry, tenant-scoped product projection and accessible product links.
2. **E4 Multi-Product Composer v1** — slot constraints, explicit product/variant selections, current shared price/stock evidence, atomic grouped cart intent and mandatory cart revalidation contract.

New specialization helper:

`shoporation.room-scene-composer.v1`

It is an adapter/read-model layer only.

## Room-slot model

For a `kind = room` scene:

- every hotspot becomes one E4 composer slot;
- the hotspot product is the slot's only eligible product;
- the merchant can mark a hotspot as required or optional in the complete set;
- an optional item is excluded until the shopper explicitly includes it;
- a required item must have a selected valid variant;
- one valid variant may be selected deterministically;
- when multiple valid variants exist, no variant is silently guessed;
- the shopper must explicitly select the actual catalog variant;
- a merchant may define an explicit default variant, but it must still exist in current authoritative catalog evidence.

This is suitable for real catalog labels representing color, material or finish. The specialization never infers that a label is a material/color claim.

## Authority boundary

The Room Composer owns none of product, variant, pricing, inventory, cart persistence, checkout, order or payment authority.

Interactive Scene catalog projection now exposes variant evidence from the same tenant-scoped product/variant/channel read model:

- variant id and catalog label;
- channel visibility;
- current shared price evidence;
- current stock availability/status.

The room subtotal is display evidence only. E4 continues to mark pricing non-authoritative and requires cart revalidation.

## Atomic complete-set intent

A valid room composition can produce an E4 `add` intent with:

- `atomic: true`;
- stable composition id;
- one real product/variant line per included room slot;
- slot ids preserved;
- required revalidation of composer eligibility, channel, price and stock;
- `silentReplacementAllowed: false`.

Wave 4 deliberately stops at the canonical intent boundary. The actual cart consumer/persistence and full E4 storefront closure belong to **Wave 5 — Existing engine closure**, per the accepted roadmap. Wave 4 therefore must not add a second cart path just for Shop the Room.

## Builder UX

The existing `commerce.interactive-scene@1` component remains the single Builder component.

For `sceneKind = room`, dedicated controls additionally expose:

- required vs optional room-set membership per hotspot;
- explicit default catalog variant (optional);
- real variant labels, current price display and stock status;
- Desktop / Tablet / Mobile hotspot positioning inherited from Wave 1.

The component binds its `tenantId` slot from the existing allowed runtime path `context.instanceId` and products from `catalog.interactiveSceneProducts`. Tenant identity and catalog evidence are runtime bindings, not merchant-authored Page Schema authority.

## Fail-closed rules

- missing/revoked `interactiveSceneCommerce` entitlement still removes the component server-side;
- a missing product or hidden channel makes the relevant room slot unavailable;
- an unavailable selected variant invalidates the composition;
- multiple variants never trigger silent default choice;
- an included optional slot without a selected variant is incomplete;
- invalid room composition produces no atomic add intent;
- no product substitution;
- no fabricated price, stock, material, finish or color claim.

## Packaging

Shop the Room remains **Pro** through the existing `interactiveSceneCommerce` capability. Wave 4 introduces no new entitlement code or database migration.

## Explicit non-scope

Wave 4 does not implement AR/camera room placement, 3D room planning, arbitrary floor-plan authoring, synthetic bundle SKU, bundle discount authority, inventory reservation, new cart persistence, checkout/order/payment logic, automatic substitutions or inferred material/color/finish data. It performs no staging/production database mutation.

## Acceptance target

Wave 4 closes when:

1. room hotspots translate deterministically to E4 slots;
2. variant choice is explicit and fail-closed;
3. required/optional room membership is deterministic;
4. price/stock/channel evidence stays authoritative and tenant-scoped;
5. valid complete sets produce the canonical E4 atomic intent;
6. Builder controls remain merchant-friendly with no raw JSON;
7. same binding/render contract works in Builder, preview and published runtime;
8. D/T/M interactive-scene behavior remains intact;
9. full exact-head CI and Vercel preview build are green;
10. the wave remains a stacked Draft PR directly on Wave 3 with no `main` merge or production deploy.
