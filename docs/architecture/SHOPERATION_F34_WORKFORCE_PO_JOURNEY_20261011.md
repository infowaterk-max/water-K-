# F34 – Product Owner authenticated preview proof through canonical Workforce

Date: 2026-10-11. Stack: F31 PR #1236 → F32 PR #1238 → F33 PR #1243 → F34.

## Evidence-rooted failure
F33 exact-head PR Factory run 38176206494 built the Runtime, E13 passed, and 86 browser cases completed with zero errors. The actual PO proof entered `/api/auth/workforce-login` from the versioned Loot Vault v2 Preview, not the old `/storefront-template-preview-login` auth shell assumed by the Playwright runner. Its final path stayed on Workforce and produced `FINAL_PREVIEW_IDENTITY_MISMATCH`. Meanwhile the engine E13 test authenticated via real Workforce credentials, verifying that legitimate auth path works. This is a stale test-runner assumption, not a reason to bypass MFA, revert identity, or forge acceptance.

## Bounded repair
The PO runner now asserts `/api/auth/workforce-login?next=/storefront-template-preview?template=gaming.loot-vault&version=2&page=home&...&factory=1`; requires exact Factory identity in its return destination; locates the one visible canonical Workforce form; submits the existing test credentials through real Supabase auth; and demands a browser-observed redirect to the exact versioned Factory preview. TOTP, staff role and all downstream account, commerce, showroom and source provenance checks remain enforced. Missing or expired credential, unresolved MFA and forbidden preview must return a blocking proof error.

## Not complete by this unit
The separate technical QA manifest is currently uploaded before PO proof is consumed. F34 corrects authentication verification, but does not claim end-to-end cross-workflow handoff or human Product Owner approval. A later bounded producer-to-consumer proof reconciliation must require exact PO artifact SHA and checksum before F31 closure. The result remains DRAFT without main merge, Supabase changes, Vercel cost changes or production deploy.
