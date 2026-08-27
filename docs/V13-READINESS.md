# Water-K V13 readiness

## Scope
V13 builds a governed Business Control Tower above the V9–V12 commerce, customer-value and operations layers. It detects cross-domain risk, explains evidence, prioritizes human decisions and tracks resolution without autonomously changing high-impact business state.

## Implemented migrations
- 093 control tower foundation: alerts, event ledger, human decision tasks, processing runs
- 094 strict/idempotent alert and task lifecycle
- 095 deterministic detector engine and stale-condition resolution
- 096 human task planner, control queue and executive KPI read models
- 097 system/integration health detector and control-cycle orchestration
- 098 immutable identity/event hardening and task ownership
- 099 V11 loyalty-debt/customer-value control signals
- 100 current-incident aging integrity
- 101 reopened-incident state hygiene
- 102 explicit Supabase service-role source grants

## Detection coverage
- V12 order/fulfillment exceptions, SLA aging and payment/fulfillment mismatches
- V12 inventory pressure and zero available-to-promise conditions
- V10 overdue/high-value/high-priority commercial opportunities
- support tickets requiring high/urgent or aging attention
- failed/blocked/stale integration jobs and failed webhooks
- V11 debt-aware loyalty liability signals

## Governance and safety
- V13 detector functions create/update only control-plane alerts/tasks/events/runs.
- V13 does not autonomously change orders, stock, refunds, loyalty balances, offers, prices, customer eligibility or benefits.
- High/critical conditions generate human decision tasks with due dates.
- Task start assigns the current admin as owner; completion requires an explicit outcome.
- Alert transitions are strict and event-key idempotent.
- Event records are append-only; alert/task identity keys are immutable.
- Resolved incidents reopen only when the condition is detected again; dismissed incidents reopen automatically only on severity escalation.
- Current incident age is separate from lifetime alert history, preventing stale historical age from distorting SLA/control-health metrics.
- Reopened incidents do not inherit previous acknowledgement, snooze or closure metadata.

## Security
- All V13 public-schema state tables have RLS enabled.
- anon/authenticated direct access is revoked.
- privileged SECURITY DEFINER functions use an empty pinned search path and revoke PUBLIC/anon/authenticated EXECUTE.
- privileged mutation functions are service-role only.
- V13 views use security_invoker=true and service-role-only SELECT.
- Source-table SELECT grants required by security-invoker control views are explicit for service_role, compatible with newer Supabase Data API exposure defaults.

## Admin experience
`/admin/iranyitokozpont` provides:
- control-health score
- critical/high/open/aging/overdue-task KPIs
- commercial value-at-risk indicator
- system/integration health status
- category/severity workload summary
- prioritized decision/exception queue
- acknowledge, snooze, resolve and dismiss controls
- human task start/complete controls
- direct links to the existing source admin modules
- manual idempotent control-cycle trigger

## Audit findings resolved
- Added automatic task ownership when an admin starts work.
- Corrected task reopen audit so cancelled/completed origins remain accurate.
- Made control event records append-only and alert/task identities immutable.
- Separated current incident age from first-ever alert detection.
- Cleared stale acknowledgement/closure metadata on a genuinely reopened incident.
- Added explicit service-role grants for older source tables used by V13 security-invoker views/detectors.
- Kept source workflows authoritative: V13 links back to Operations, Inventory, Sales, Support, Customer Value and Integrations instead of creating parallel mutation paths.

## Verification and rollout
- V13 is isolated on `feature/native-store-v13` and PR #13 targets the audited V12 readiness branch.
- GitHub CI validates dependency installation, TypeScript and production build.
- The migration chain has been statically audited against V10 commercial opportunities, V11 loyalty debt/read models, V12 operations/inventory semantics, support tickets and integration-job schemas.
- No production/main merge, production Supabase migration or production Vercel deployment is performed by this readiness checkpoint.

## Final gate
V13 is readiness-green only after the final `docs/V13-READINESS.md` head passes GitHub TypeScript + production build CI and PR #13 remains mergeable against `feature/native-store-v12`.
