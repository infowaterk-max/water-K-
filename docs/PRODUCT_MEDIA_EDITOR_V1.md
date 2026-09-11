# Product Media Editor v1

## Scope

This slice extends Product Intake with a non-destructive visual media editor. It intentionally does **not** add 3D/AR asset ingestion yet; 3D remains a later Product Media capability that the Visual Builder can consume.

The editor provides:

- drag-to-position image composition instead of pixel-coordinate forms;
- 1×–3× visual zoom and 90° rotation controls;
- separate `card`, `detail` and `mobile` presentation contexts;
- simultaneous live previews before saving;
- client-side quality guidance based on source width and active zoom;
- reset-to-original behavior without touching the source object in Storage;
- reusable, tenant-scoped media presets;
- an always-visible image-edit action in Product Intake;
- application to actual existing variants only;
- quick groups for same color, same size and all existing variants;
- two explicit fan-out modes: reuse the same media asset, or copy only presentation settings while preserving each target variant's own media;
- transparent skipped-variant reporting when a presentation-only target has no image.

## Authority and safety

The original image object remains immutable. Crop/zoom/position state is stored in `product_media_presentations`; presets live in `product_media_presets`.

All product-media mutations are server/service-role mediated. The database RPCs re-check `can_manage_catalog(instance, actor)`, source media ownership and every target variant's product/instance membership. Presentation changes and variant fan-out additionally require the product to remain a draft (`active=false`), so this feature cannot bypass the explicit publication gate. Variant fan-out never creates a missing variant and never publishes a product.

The current source presentation is persisted before server-side fan-out so a bulk apply can never copy stale crop/zoom metadata.

## Storefront contract

`getProducts()` exposes the saved presentation with the variant image. `ProductMediaImage` is the reusable storefront renderer for `card`, `detail` and `mobile` contexts. The current canonical product detail page consumes the `detail` presentation immediately. Future templates and the Visual Builder should consume the same contract rather than introducing a second crop authority.

The default presentation remains non-destructive and visually compatible with the previous storefront: source images use `object-fit: contain`; zoom and position only change after an explicit editor action.

## 3D / AR boundary

A future 3D/AR slice should extend Product Media with model assets (for example GLB/USDZ and validated metadata). The Product Catalog owns those assets; the Visual Builder only decides how a product's 3D viewer is placed and styled. 3D is therefore deliberately separate from this 2D presentation editor.

## Baseline

Production migration: `20260911051500_product_media_editor_v1.sql`

Customer forward migration: `0013_product_media_editor_v1.sql`

They must remain byte-identical. The customer baseline remains `snapshot-reviewed` until a genuine empty-target Fresh Install proof validates ordered migrations `0001-0013`.
