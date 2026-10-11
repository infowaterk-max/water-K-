# F29 — Customer Baseline Proof Semantics and native-target readiness boundary

**Recorded: 2026-10-11 | Core #1186 / Fresh Install #1228 | Source-only unit, no hosted writes**

## Actual producer correction

The Guard Registry formerly named a nonexistent producer (scripts/customer-baseline-guard.mjs) and nonexistent evidence directory (artifacts/customer-baseline/**). The actual local script is scripts/validate-customer-baseline.mjs, invoked by npm run db:customer:guard. The CI wraps that command through scripts/shoperation-command-diagnostic.mjs and emits artifacts/shoperation-command-diagnostics/customer-baseline.json. F29 aligns the registry to the actual producer and diagnostic output. Bare local execution emits console status, not the CI diagnostic artifact.

## Bounded evidence and adversarial expectations

The source guard verifies the ordered baseline migration files, immutable first snapshot, static release markers, forbidden customer-specific seed fragments, Auth bootstrap wiring, the default-Alap and schema-snapshot-only manifest declarations, and fail-closed status/proof hash consistency. It DOES NOT execute migration SQL or connect to a managed PostgreSQL target.

The declared Proof Semantics is therefore restricted to CAP-QUALITY, scope strength 1, and source-only status/scope/limitations/migration structure. It does NOT include CAP-AUTH, wildcard capability, native PostgreSQL row-level security, JWT identity, service-role RPC authorization, or provider delivery. Executable adversarial Sentinel tests must allow the matching source-only claim but block CAP-AUTH, higher strength and native RLS proof dimensions.

## Read-only staging inspection (2026-10-11)

Direct read-only database inventory of connected Vision Kft. waterk-staging project rfuvzgumbardvbvqjxdq: exactly three public office_* tables (office_threads, office_messages, office_tasks), three policies in those tables, and an auth schema. All four modern F28 target RPCs absent: admin_mutate_office_draft_v3, admin_queue_office_email_v6, admin_update_office_thread_relationships_v2, admin_update_office_mailbox_responsibility_v2.

The source customer-baseline manifest remains snapshot-reviewed with freshInstallProofRequired=true, proofContractSha256=null, and 69 ordered migration SQL files. Historical 0046 Fresh Install attestation is authentic historical evidence but does not cover the later Office migration lineage.

## Mandatory separate security and dependency checks

- Perform a fresh 69-file clean-target replay in a disposable target, with authoritative preflight/postflight and proof digest. Do not use prior 0046 receipts to upgrade manifest.
- Independently prove native Auth/JWT actor identity, tenant membership, Pro entitlement downgrade, privileged function EXECUTE/grants, actual RLS and SECURITY DEFINER boundaries, and cross-tenant forbidden cases against a test target matching the deployed SQL. Local mocked Server Actions cannot replace this.
- Prove staging/production migration compatibility and email provider sending before claiming runtime completeness.
- Do not deploy, mutate/reset hosted databases, issue actual emails, merge to main or create paid previews as part of F29 source metadata work.
- F29 may be closed for its source-level assurance only after exact-head CI and Lifecycle/Truth; Core #1186 and Fresh Install #1228 remain OPEN pending native tests and environment parity.

This document cannot expand the declared scope or override repository release authority.
