# Water-K V16 – Assurance, Evidence and Continuous Verification

V16 starts from the audited, CI-green V15 readiness head.

## Primary objective
Create a continuous assurance layer above V13–V15 that proves safety invariants, collects immutable evidence, tracks findings, and exposes release/operations readiness without mutating commerce state.

## Major workstreams

1. **Assurance control registry**
   - versioned control definitions
   - severity, category, check cadence and ownership metadata
   - runtime definitions immutable; new semantics require a new version

2. **Deterministic control checks**
   - V13 control-plane health
   - V14 proposal governance and stale approval detection
   - V15 runbook/circuit-breaker health
   - overdue tasks, unresolved high-risk alerts and failed automation conditions
   - no direct commerce-state mutation

3. **Immutable evidence snapshots**
   - per-check evidence payload and source timestamps
   - append-only evidence ledger
   - deterministic evidence hash for auditability
   - run-level evidence bundles

4. **Finding lifecycle**
   - deduplicated findings keyed by control + affected object
   - open / acknowledged / resolved / accepted-risk lifecycle
   - severity escalation and recurrence tracking
   - accepted risk requires actor + rationale + expiry

5. **Readiness and assurance score**
   - weighted assurance score
   - critical/high finding gates
   - stale evidence detection
   - control coverage and check freshness KPIs

6. **Admin Assurance Center**
   - Admin → Biztosítékok
   - manual assurance cycle
   - finding acknowledge/resolve/accept-risk actions
   - evidence inspection and source-module links

7. **Governance / security**
   - RLS on all V16 state tables
   - explicit service_role grants because new Supabase projects no longer auto-expose public tables
   - SECURITY DEFINER functions only where required, with pinned empty search_path and revoked PUBLIC/anon/authenticated EXECUTE
   - security_invoker views with service_role-only SELECT
   - no production/main merge, production Supabase migration or Vercel deployment until explicitly approved
