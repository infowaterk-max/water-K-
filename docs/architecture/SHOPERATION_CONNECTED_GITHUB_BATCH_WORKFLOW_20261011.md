# Shoperation — Connected GitHub batch workflow

**Product Owner decision: 2026-10-11.** Purpose: develop and verify coherent units while avoiding repeated GitHub device-code authorization and needless Vercel compute. This operating convention does **not** supersede AGENTS.md, the Living Roadmap, release authority or any security gate.

## Normal flow — no device code

1. Read the actual remote main, current source branch, latest CI, open release PRs and relevant evidence blockers before work; never inherit a previous SHA/status.
2. Form a bounded business/dependency work package under Release Risk <=5/5. Run Development Guard and a plan-only Define/Model/Challenge/Improve with Plan Before Code PASS **before** editing application or test source.
3. Implement and locally verify each coherent batch, using the already available stopped persistent sandbox **only if actual execution is required**. Prefer focused regressions over redundant full builds. Edit-Time, Reference and Implementation Sync must remain PASS, with zero missing required dependencies.
4. For the final batch, run required Knowledge/Replay, customer baseline (when applicable), TypeScript, local targeted tests and other selected guards. Keep genuine native database/role/tenant/provider proof requirements OPEN when not executed.
5. Publish **one reviewed commit/tree per coherent batch** via the user's already connected GitHub integration when supported. Git Data API: fetch exact parent commit/tree; upload changed file blobs as UTF-8/base64; compare returned blob SHAs with `git rev-parse HEAD:<path>` or `git hash-object` from the verified local tree; create the tree on exactly that base; create commit with exactly the verified parent; create/update a **development branch only**, never main. Verify resulting branch SHA, parent, file list and the unchanged main through a separate API read. Do not force update a diverged branch.
6. Connected GitHub authentication remains **outside the sandbox**. Do not copy, cache, print or persist any token in sandbox files or snapshots. If a large/complex binary Git tree cannot be transferred and validated through the linked API, use the official GitHub CLI device flow only as a **bounded fallback** and group all required pushes into one authorized session, then log out and stop sandbox.
7. One exact-head CI run per finalized branch is the default. Do not spawn duplicate runs while one is active, and do not treat focused tests, source-level proof or successful CI substeps as full Truth/Lifecycle closure. On red CI, inspect the exact failed step and producer artifacts; group related issues for a follow-up bounded repair before requesting another push.
8. Merge or production deployment always remains separately gated on Capability/Dependency Closure, exact-head CI, Completion Truth, Lifecycle, Product Owner authority and actual environment compatibility. No staging/production DB mutation, environment pause/resume or external provider action is implied by an accepted source unit.
9. Stop sandbox after the necessary execution phase and confirm STOPPED. The repository is the durable source of truth; Vercel snapshots are transient execution aids, not the sole backup.

## Current F28 evidence ceilings

- Source-only Office Composer and advanced Communication Hub actor/tenant/receipt action mocks are verified but **do not** prove native Supabase JWT, SQL SECURITY DEFINER behavior, RLS, deployed migration parity or real plan downgrades.
- F28B's customer baseline completion reference to `GUARD-CUSTOMER-BASELINE` currently lacks declared proof semantics. Sentinel correctly returns `REVIEW` for `SENTINEL_INTEGRITY_PROOF_SEMANTICS_UNKNOWN` until that producer has accurate, independently supported semantics. A test must not force that decision to `PASS`.
- Core #1186 and Fresh Install #1228 are not release-closed by the batch-workflow change. Maintain explicit security and database dependencies in their canonical tracking issues.

This is a delivery-efficiency policy, **not** permission to merge without evidence, to mask CI red statuses or to expand live infrastructure usage.
