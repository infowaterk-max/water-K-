# Water-K V15 readiness

## Scope
V15 adds a governed runbook automation layer above V13 Control Tower and V14 Governed Actions. It coordinates multi-step control-plane work with retries, human task synchronization, SLA escalation and circuit breakers without directly mutating commerce/customer source state.

## Implemented migrations
- 114 runbook registry, instances, step runs, events and global control
- 115 deterministic planner, default runbooks and activation gates
- 116 safe step executor, retry/backoff and instance transitions
- 117 orchestration cycle, reconciliation, escalation and KPI/health views
- 118 immutable identity, safe resume and global pause
- 119 activation idempotency, global-control audit and terminal-state guards
- 120 V13 incident-aware V14 proposal + V15 runbook integrity
- 121 V14 simulation idempotency preservation and high-impact attachment hardening
- 122 real human-task synchronization with `waiting` step state
- 123 runtime read-only versioned runbook registry

## Functional coverage
- category/severity-based runbook planning for operations, inventory, service, commercial, customer and system alerts
- deterministic per-incident instance identity
- ordered steps using allowlisted `notify_admin`, `human_task`, `record_decision` control-plane actions
- activation/resume gates for global pause, circuit breaker, active source incident and V14 approval where required
- per-step attempt caps and retry backoff
- cumulative instance failure cap
- global circuit breaker after repeated technical failures
- runbook deadlines and escalation tasks
- automatic cancellation when source alert closes, proposal becomes invalid or V13 incident changes
- human task steps remain `waiting` until the linked V13 control task is actually completed
- manual global pause/resume and per-instance activate/pause/resume/cancel/run-step controls

## Cross-version integrity
- V14 action proposal keys are incident-aware after V15 hardening.
- A proposal created before the current V13 `incident_started_at` is stale.
- V14 simulation retains strict event-key ownership and now snapshots `incident_started_at`.
- High-impact V15 runbooks are not even planned until a current-incident V14 proposal exists.
- Old incident runbooks cannot continue after a resolve/reopen cycle.

## Governance and security
- new public tables use RLS and direct anon/authenticated access is revoked
- privileged mutation functions are `SECURITY DEFINER`, pinned to empty search path and service-role-only
- automation events and global control events are append-only
- instance and step identities are immutable
- terminal runbook and step states cannot be reopened by direct runtime updates
- versioned runbook/step definitions are runtime read-only; changes require a new migration/version
- V15 initial adapters modify control-plane records only

## Safety boundary
V15 does not directly modify orders, stock, refunds, payment status, loyalty balances, prices, offers, discounts, benefits or customer eligibility. High-impact workflows depend on V14 governed approval and still execute only control-plane actions in this release.

## Admin experience
`/admin/automatizalas` provides automation health, circuit state, planned/active/paused/failed/overdue/escalated KPIs, runbook progress, source alert context, V14 proposal status and manual lifecycle/step controls.

## Audit findings resolved
- resume originally bypassed source/circuit/approval gates
- initial activation did not verify stale V14 approval
- global pause lacked an append-only audit ledger
- reopened V13 incidents could otherwise reuse old runbooks/proposals
- V15 incident hardening initially risked regressing V14 simulation idempotency; strict key ownership was restored
- high-impact runbooks could be planned without an attachable proposal
- `human_task` steps initially advanced at task creation rather than task completion
- runbook registry definitions were still runtime mutable

## Final gate
V15 is readiness-green only when the final readiness head passes dependency install, TypeScript check and production build CI, and PR #15 remains mergeable against `feature/native-store-v14`.
