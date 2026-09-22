# Water-K V14 readiness

## Scope
V14 adds a governed policy/action layer above the V13 Business Control Tower. It converts active control alerts into versioned, deterministic action proposals that can be simulated, approved, rejected and safely recorded/executed through a strict allowlist.

## Implemented migrations
- 103 action policy/proposal/approval/execution foundation
- 104 deterministic proposal planning and expiry/cancellation
- 105 dry-run simulation and source staleness detection
- 106 approval governance and safe execution foundation
- 107 seeded safe policies, action-cycle orchestration and admin read models
- 108 immutable identities, append-only ledgers and terminal-state guards
- 109 dual approval/rejection hardening
- 110 immutable policy-version definitions and policy-aware simulation integrity
- 111 simulation/execution idempotency ownership
- 112 decision idempotency ownership
- 113 safe adapter integration with V13 control tasks

## Governance model
- Policy definitions are versioned. A published `policy_key + version` definition cannot be silently edited; create a new version instead.
- Only the enabled latest version per policy key participates in planning.
- Proposals are deterministic per alert + policy version.
- Proposals expire automatically or cancel when the V13 source alert closes.
- Simulation is mandatory before approval.
- Simulation becomes stale when the source alert changes/closes or the policy is disabled.
- Single and dual approval modes are supported.
- Dual approval requires two distinct admins; one approver cannot fill both slots.
- Rejecting a partially approved dual proposal cleanly terminates the proposal.
- Approved/terminal proposals cannot be reopened through normal lifecycle transitions.

## Safe execution boundary
Initial V14 execution adapters are allowlisted to:
- `human_task`: creates/updates a deterministic V13 control task
- `notify_admin`: creates an admin-attention V13 control task; no external notification transport is invoked
- `record_decision`: records the governed execution decision only

V14 does not directly mutate orders, stock, refunds, payments, loyalty balances, offers, prices, discounts, benefits or customer eligibility.

## Audit findings resolved
- Fixed dual-approval slot conflict when the second reviewer rejects after a first approval.
- Blocked rejection or extra approval after a proposal is fully approved.
- Added strict event/execution key ownership so an idempotency key cannot be reused for another proposal.
- Corrected re-simulation audit `from_status` semantics.
- Made policy-version definitions immutable while still allowing enable/disable rollout control.
- Added policy-aware simulation stale detection.
- Planner now evaluates latest enabled version per policy key and supports minimum priority conditions.
- Converted safe execution from a no-op ledger into deterministic V13 human/admin control-task creation without crossing into commerce-state mutation.
- V14 proposal, execution and approval audit ledgers are append-only; policy/proposal identity is immutable.

## Security
- All V14 public-schema state tables have RLS enabled.
- anon/authenticated direct access is revoked.
- privileged SECURITY DEFINER functions use pinned empty search_path.
- privileged mutation functions are service-role only.
- V14 read views use security_invoker=true and service-role-only SELECT.
- Admin APIs require the existing server-side admin request authorization.

## Admin experience
`/admin/intezkedesek` provides:
- active/proposed/simulated/approved/high-impact/stale KPIs
- proposal queue with risk, impact class, approval state and expiry
- simulation, approval, rejection and safe execution controls
- dual-approval progress
- direct navigation back to the V13 Irányítóközpont
- manual idempotent action-cycle trigger

## Rollout status
V14 is isolated on `feature/native-store-v14`; PR #14 targets the audited V13 readiness branch. Production/main, production Supabase and production Vercel remain unchanged.

## Final gate
V14 is readiness-green only when the final readiness head passes dependency installation, TypeScript check and production build CI and PR #14 remains mergeable against `feature/native-store-v13`.
