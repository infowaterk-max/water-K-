# Product Intake Center 2.0

Product Intake 2.0 extends the production Product Intake Center without introducing a second catalogue authority.

## Scope

- **Product copy:** copy an existing same-tenant product into a new inactive draft, including variants, category, attributes, optional SEO, optional B2C/B2B settings and optional physically duplicated product media. Stock is intentionally opt-in and defaults to zero.
- **CSV / XLSX onboarding:** CSV remains supported; XLSX is parsed server-side with bounded ZIP handling, worksheet selection and normalization into the existing mapping → validation → preview → durable apply-plan pipeline. SEO title and meta description become optional import mappings.
- **Product Copilot:** contextual Hungarian suggestions for descriptions, SEO and category. The Copilot has no product mutation authority. A human must explicitly apply a suggestion, after which the existing draft autosave authority may persist it. Publication remains a separate explicit action.

## Authority and safety

All catalogue mutations continue to require `catalog.manage`, current-store scope and server/service-role mediation.

Product copy uses three database RPCs:

1. `prepare_catalog_product_copy_v1` creates the inactive draft and deterministic source→target variant map.
2. Application storage copying creates independent media objects under the target product path.
3. `finalize_catalog_product_copy_media_v1` records copied media and remaps variant primary-media references atomically. If storage/finalization fails before apply, `rollback_catalog_product_copy_v1` removes the prepared draft.

Copy batches are idempotent. Existing products are never modified by the copy operation. The source product and target product must belong to the same webshop instance.

XLSX parsing rejects encrypted archives, dangerous ZIP paths, unsupported compression, macro/ActiveX/embedded active content and excessive archive, entry, expanded-size, row or column counts. No spreadsheet formula is evaluated.

Product Copilot uses Vercel AI Gateway with a bounded structured response contract and a separate database-backed per-user/per-store rate limit. It never receives mutation tools and never writes to catalogue tables. If Gateway authentication/configuration is unavailable, it fails closed while ordinary product editing remains usable.

## Customer baseline

Customer forward migration `0011_product_intake_center_v2.sql` is byte-identical to the production migration. The baseline remains `snapshot-reviewed` with `freshInstallProofRequired=true` until a genuine empty-target replay of ordered migrations `0001–0011` succeeds. The inactive Fresh Install project is not a reason to pause production or staging.

## Acceptance

Before merge/release:

- Product Intake v1 regression contracts remain green;
- XLSX parser and malicious archive tests pass;
- product-copy service-role/tenant/rollback contracts pass;
- Product Copilot suggestion-only and explicit-approval contracts pass;
- full quality, TypeScript, production build and security audit pass;
- staging migration applies cleanly and new RPC privileges are verified;
- Vercel preview is READY;
- feature branch is synchronized with current `main` before merge.
