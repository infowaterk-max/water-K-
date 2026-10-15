# Core #1186 F6-U03j — Office inbound / mailbox migration DAG evidence

2026-10-15 · DRAFT [PR #1353](https://github.com/infowaterk-max/water-K-/pull/1353), stacked on the blocked [PR #1350](https://github.com/infowaterk-max/water-K-/pull/1350) → #1347 → #1335 → #1332. Source owner: [issue #1228](https://github.com/infowaterk-max/water-K-/issues/1228). This is **source-only negative release evidence**, not a SQL installation or provider acceptance.

## The genuinely observed blocker

Exact-source 59-file PostgreSQL17 [run #38800810206](https://github.com/infowaterk-max/water-K-/actions/runs/38800810206) correctly failed during unchanged `0055_communication_hub_2_0_foundation_v1.sql`: relation `public.office_mailboxes` does not exist. PostgreSQL reports this at the first `ALTER TABLE public.office_mailboxes ADD COLUMN responsible_user_id`. In an independent read-only hosted Fresh Install observation `office_mailboxes`, `office_thread_email_routes`, `office_drafts`, and `office_attachments` were also absent. Local 59-file COMMIT, original postflight, and forced-rollback proof are all **NOT PROVEN**.

## Source-backed Office DAG candidates

The original timestamped main migration `20260908030000_digital_office_real_inbound_foundation_v1.sql` creates tenant-bound `office_mailboxes` and `office_thread_email_routes`. `20260908030500` normalizes mailbox columns and `20260908031000` establishes service-only mailbox privileges. The `20260908034000` source creates Office drafts; `20260909203604` creates attachment metadata and uses both mailbox and draft objects; `20260909204635` creates private message-attachment metadata, followed by cleanup, scanning and hardening sources; `20260910070300` adds Communication Hub foreign-key indexes. These original source families are separate from the frozen numbered customer-baseline 0001–0058.

The source-only tool `scripts/shoperation-f6-u03j-office-dependency-dag.mjs` checks the complete 59 approved blobs via the existing canonical `validateReviewedBaseline` and pins 18 candidate modern Office predecessor/follow-up files to actual Git blobs in verified `main` commit `dc726ea075d6918883595442d446e37c023731e4`. It uses **conservative anchored DDL** and table-reference scanning to emit creator locations, candidate dependency edges and a four-table minimum gap. It fails if the 59-source list or source bodies drift. This is not a complete SQL parser. In particular the complete function signature, RPC, provider Auth/Storage, GRANT/trigger and policy dependency graph remains **UNRESOLVED**.

The chronological source candidates are not release-approved for wholesale replay: inherited timestamp migrations can carry superseded Office/Team Chat policy or authorization semantics. Old blanket-Pro policies cannot override the already accepted Alap support/customer communication and actual Pro-only internal Team Chat policy. Separately verify all dependencies and side effects before any additive/versioned migration package.

## Hard truth and release gate

A dedicated GitHub Actions workflow must find `decision=BLOCKED_59_SOURCE_DAG`, **not PASS**. It runs no PostgreSQL or Supabase operations. Positive CI on this source-diagnostic unit only means the missing-source map is reproducible and the frozen 59-file baseline is **still not fit** for full Fresh Install source execution.

Next separately guarded work under issue #1228: reconcile complete chronological migration source DAG, supersession and inter-file foreign keys, create a versioned/additive **approved** customer-baseline release package while preserving historical SQL provenance, then run a real disposable PostgreSQL 17 full one-transaction installation and pre-COMMIT forced rollback without fixture table injections. Provider-managed Auth/Storage, TLS connection identity, authenticated tenant Alap/Pro and hosted schema reset remain separately blocked.

The original hosted `FRESH_REPROVISION_HOSTED_EXECUTION_NOT_AUTHORIZED` exception stays before either `DROP SCHEMA`. No Supabase project was changed, restarted or newly created. `waterk-platform` remains untouched, `waterk-staging` remains paused, Fresh Install is not reset; **zero hosted SQL migrations** executed. Parent issue #1186 stays OPEN.
