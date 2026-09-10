# Roadmap Block 14 – Catalog Product Onboarding & Import UX

## Canonical scope

Block 14 is the catalog-entry workflow that was historically deferred from the earlier commerce/admin blocks. Its accepted scope is intentionally narrow:

- manual product creation;
- CSV product onboarding/import;
- explicit CSV field mapping;
- validation and preview before mutation;
- category assignment;
- product attribute assignment;
- product media upload;
- draft-first product workflow.

The existing catalog bulk/CSV variant updater is retained for price, stock and active-state maintenance. Block 14 extends the canonical catalog surface for **new-product onboarding** rather than creating a second inventory/catalog engine.

## Explicit non-scope

Block 14 does **not** add supplier feed/API synchronization, automatic catalog enrichment, marketplace bulk publishing, advanced PIM/ERP connectors, AI-generated product data, Page Schema/Templates, template runtime, drag-and-drop editing or Visual Builder/live canvas functionality.

## Authority and safety contract

All mutation entry points require `catalog.manage`, resolve the current store scope, and use the server-side admin client. New DB RPCs re-check `can_manage_catalog(instance, actor)` and are executable only by `service_role`.

Manual onboarding calls `create_catalog_draft_v1`. The product and its initial variant are both created with `active=false`, and a tenant-scoped idempotency key plus payload hash protects retries from duplicate creation or key reuse with a different payload.

CSV onboarding is a two-phase contract. The server parses/matches fields, validates rows, checks tenant-local SKU/slug collisions and persists the exact valid apply-plan in `catalog_onboarding_batches`. `onboardingApply` receives only the batch id and calls `apply_catalog_onboarding_batch_v1`; the browser does not send authoritative product mutations back during apply. Invalid rows are preserved in preview evidence but excluded from the apply-plan. The valid plan is applied atomically; a DB failure rolls the complete apply transaction back. Replaying an already-applied batch returns its durable result.

Category and product relationships are tenant-scoped. Composite product/instance foreign keys prevent cross-tenant category, attribute and media assignment. Product slug and variant SKU are unique per webshop instance.

Product media uses a dedicated `product-media` bucket. The API bounds size to 8 MB, accepts only JPEG/PNG/WebP/AVIF, checks file signatures, verifies product ownership inside the current instance, and records metadata/audit through `record_product_media_v1`. If metadata persistence fails after object upload, the uploaded object is removed.

## Entitlement / Builder compatibility

The admin surface remains behind the existing `importExport` plan feature plus `catalog.manage`; no new package vocabulary is invented in Block 14. Catalog entities are ordinary tenant-scoped configuration/data primitives and do not introduce Page Schema or Builder runtime contracts. They can be consumed by later Builder-compatible product components without coupling catalog storage to a template.

## Customer database baseline

Block 14 changes the sellable customer schema, so the previous genuine `0001–0008` Fresh Install proof cannot remain authoritative. The ordered customer baseline now adds `0009_block14_catalog_onboarding_import_ux.sql` and intentionally moves the manifest to:

- `status=snapshot-reviewed`;
- `freshInstallProofRequired=true`;
- `proofContractSha256=null`.

The manifest may return to `ready` only after the exact `0001–0009` contract, Auth bootstrap, neutral seed and pre/postflight inputs pass a genuine empty-target Fresh Install proof and the resulting contract hash is recorded.

## Acceptance evidence required before merge

- targeted Block 14 parser/API/SQL/media tests;
- normal full CI and release/security gates;
- staging migration applied successfully;
- genuine customer Fresh Install proof for `0001–0009`;
- branch synchronized with the then-current `main` before final merge;
- after merge: green `main` CI, READY production deployment, healthy production/staging Supabase projects, healthy `/api/health`, and unchanged Water-K `pilot` tenant invariants.
