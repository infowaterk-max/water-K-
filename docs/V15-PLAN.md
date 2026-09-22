# Water-K V15 – Governed Runbooks, Escalation and Automation Control

V15 starts from the audited and CI-green V14 readiness head `9ea09a561d1f420c6d36b37f28b55e3bf1b38e3c`.

## Primary objective
Turn V13 control alerts and V14 governed actions into auditable multi-step operational runbooks with escalation, retries, deadlines and circuit breakers, while preserving human approval for high-impact actions and keeping commerce/customer state protected.

## Major workstreams

1. **Versioned runbook registry**
   - immutable runbook key/version definitions
   - ordered steps with action kind, timeout and dependency rules
   - explicit risk level and approval mode

2. **Runbook instances**
   - deterministic alert/proposal → runbook instance creation
   - lifecycle: planned → active → paused / completed / failed / cancelled
   - immutable instance identity and source snapshot

3. **Step execution engine**
   - step lifecycle: pending → ready → running → succeeded / failed / skipped / cancelled
   - only V14 allowlisted safe actions in V15 initial release
   - deterministic idempotency key per instance/step/attempt
   - retry/backoff policy with max-attempt cap

4. **Approval and precondition gates**
   - reuse V14 approved proposals where appropriate
   - high-impact runbooks require approved governed action before activation
   - source alert/proposal freshness checks before each critical transition

5. **Escalation and SLA**
   - step due times and runbook deadlines
   - escalation levels and owner handoff
   - overdue/high-risk cases create V13 control tasks rather than mutating source systems

6. **Circuit breakers and safety**
   - per-runbook and global pause state
   - stop execution after repeated failures or stale source state
   - no direct order, stock, refund, payment, loyalty, pricing or eligibility mutation

7. **Admin Automation Center**
   - `/admin/automatizalas`
   - active/paused/failed runbooks, overdue steps, retries and escalations
   - manual activate/pause/resume/cancel/run-step controls
   - links to source alert, proposal and control tasks

8. **Verification**
   - RLS/service-role audit
   - lifecycle/idempotency audit
   - migration dependency audit
   - TypeScript + production build CI
   - no production/main merge or deployment until explicitly approved
