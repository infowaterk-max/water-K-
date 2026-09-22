# Roadmap Block 12 – Migration Assistant 1.0

## Accepted launch scope

Block 12 is the guided **Shopware 6 → Shoporation** migration flow. It reuses the existing `importExport` entitlement and the established tenant/RBAC authority; it does not introduce a parallel entitlement engine and it does not advance Page Schema / Templates (Block 21) or Visual Builder (Block 22).

The launch workflow is: create source run → verify Shopware connection and inventory → stage in bounded pages with checkpoints → dry-run/preview and mapping validation → resumable catalog apply → target validation → optional guarded rollback.

## Safety contract

- Shopware integration credentials are request-only secrets. `Access Key ID` and `Secret Access Key` are never persisted in `migration_runs`, staging records, logs or audit metadata.
- Source URLs require HTTPS. DNS results are checked and private/loopback/link-local destinations are rejected; redirects are rejected to reduce SSRF bypass surface.
- Every run, staged record, issue and change journal row carries explicit `instance_id` + `organization_id`; database triggers reject tenant mismatch.
- Merchant reads are RLS-scoped; mutation tables are not directly writable by authenticated clients.
- Apply and rollback RPCs are service-role only and re-check catalog authority plus explicit instance scope.
- Shopware external IDs are persisted separately from target commerce IDs. This makes reruns deterministic instead of creating silent duplicates.
- Apply runs in bounded atomic batches. A batch and its change journal commit or roll back together.
- Rollback touches only changes made by Block 12. If the target row changed after migration, rollback fails closed instead of overwriting newer merchant work.
- No Supabase Auth account is created from Shopware customer records.
- No payment token or K&H/vPOS state is migrated or modified.
- Water-K Trial/Add-on/platform override state is outside this block.

## Entity coverage

The Shopware inventory and staging layer covers products/variants, categories, manufacturers, media, customers, historical orders and promotions. Products, variants, stock and HUF prices have a lossless target write contract today and are therefore applyable after dry-run.

Categories, manufacturers, images, customer identity, historical orders and complex promotion structures are preserved as normalized staging evidence and reported as `TARGET_WRITE_DEFERRED` where the current target model cannot represent them losslessly. This is deliberate: Block 12 must not invent target data or smuggle future schema work into the migration path. Pages/SEO follow the same rule and are not advanced ahead of Block 21.

## State model

`draft → inspected → staging → ready/needs_attention → applying/paused → applied → completed`

A partially applied run can resume from `paused`. Applied/completed/failed runs can use guarded rollback and end as `rolled_back`.

## Fresh customer baseline

The production migration is mirrored as ordered customer-baseline forward migration `0006_block12_migration_assistant.sql`. Adding the forward migration intentionally changes the baseline lifecycle from `ready` to `snapshot-reviewed`; a genuine empty-target Fresh Install proof is required before the baseline may be marked `ready` again.
