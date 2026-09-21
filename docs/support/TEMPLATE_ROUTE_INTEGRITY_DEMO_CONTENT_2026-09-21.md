# Template Route Integrity + Demo Content Foundation — 2026-09-21

```yaml
id: SKB-TEMPLATE-ROUTE-DEMO-2026-09-21
status: implemented
evidence: acceptance_verified
scope: global
area: template-factory/storefront/content
versions: "Template Factory / Storefront Template Installation current branch"
symptom: "Template navigation could contain visually plausible internal links whose destination did not exist, did not consume its query parameters, or had no editable merchant content behind it."
context: "Playroom v20 acceptance exposed service/footer destinations such as shipping, payment, returns, about and template-specific /oldal/* links. The same risk applies to the remaining template portfolio."
diagnostic:
  - "Enumerate static href/action destinations from Page Schema configs."
  - "Classify known storefront routes, catalog deep-link contracts, dynamic content routes and anchors."
  - "Require a demo content fixture for every static /oldal/<slug> and /blog/<slug> destination."
  - "Treat protected Preview HTTP 302 as Vercel-auth evidence only, not application-health PASS."
root_cause: "Template validation previously checked Page Schema/component capability but not end-to-end navigation destination integrity or CMS content materialization."
attempted_or_failed:
  - "Do not solve dead links with CSS, hidden links or template-local placeholder pages."
  - "Do not auto-publish generated shipping/payment/legal/business claims."
  - "Do not let template refresh overwrite merchant-owned/adopted content."
resolution:
  - "Added shared Template Route Integrity hard gate."
  - "Added shared canonical demo content generation for standard service pages and safe starter fixtures for template-specific content targets."
  - "Template Preview rewrites known links back into the selected template/version."
  - "Template install materializes content fixtures as tenant-scoped CMS drafts only."
  - "Added provenance states fixture/adopted/retired and auto-adoption on merchant content edit."
  - "Existing merchant slug and adopted fixture always win over template refresh."
  - "Stale untouched fixture may retire on template switch."
  - "Published fixture keeps a system-level Minta tartalom warning until adoption."
verification:
  - "Vercel Preview exact-head build completed READY/success."
  - "Staging migration applied successfully; provenance columns and RPCs present."
  - "Staging acceptance: generated content created as draft + fixture."
  - "Normal CMS edit changed fixture -> adopted."
  - "Template refresh returned preserved=1 and did not overwrite merchant title/body."
  - "Legacy untouched fixture returned retired=1 and remained draft."
  - "Acceptance test content was deleted after proof; remaining=0."
  - "Exact-head GitHub Actions workflow did not run; do not report CI PASS from this record."
prevention:
  - "Every new/re-accepted template must pass Route Integrity before portfolio acceptance."
  - "A template link is not accepted merely because its URL resolves; query parameters must have an actual storefront consumer."
  - "Generated service/business content must remain draft until merchant review/publish."
  - "Template switching must preserve adopted and merchant-authored content."
automation: HUMAN_REQUIRED
risk: medium
```

## Canonical engineering contract

See `docs/STOREFRONT_TEMPLATE_ROUTE_INTEGRITY_DEMO_CONTENT_CONTRACT.md`.

## Acceptance evidence notes

- Staging project only was mutated for lifecycle proof; production was not changed.
- The lifecycle proof used isolated acceptance slugs and cleaned them up after verification.
- Vercel-authenticated HTTP fetching remained blocked at the Vercel SSO layer in the available fetch path, so live visual/app-route PASS still requires browser/human verification where relevant.