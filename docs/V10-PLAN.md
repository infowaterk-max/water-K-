# Water-K V10 – Commerce automation roadmap

V10 starts from the audited V9 readiness head and focuses on turning the intelligence layer into controlled, measurable commercial automation.

## Objectives

1. **Commercial opportunity engine**
   - Unified B2C/B2B opportunity queue.
   - Priority, expected value, due date, reason and recommended action.
   - Deterministic/idempotent generation from V9 intelligence.

2. **Offer governance**
   - Draft offers tied to a customer/reseller and commercial opportunity.
   - Margin-guarded discount approval before activation.
   - Explicit lifecycle: draft → approved → sent → accepted/expired/cancelled.
   - Immutable commercial snapshot on approval.

3. **Sales task orchestration**
   - Human-in-the-loop tasks for high-value/critical opportunities.
   - Ownership, due dates, completion/outcome logging.
   - No automatic high-value B2B outreach without an explicit policy.

4. **Revenue forecast**
   - Expected pipeline value from open opportunities and approved offers.
   - B2C/B2B split, weighted value, overdue value and conversion tracking.

5. **Automation safety**
   - Reuse V9 communication consent/suppression controls.
   - Idempotent planners/dispatchers and auditable state transitions.
   - Service-role-only privileged functions, pinned/empty search_path where appropriate.

6. **Admin command center**
   - New commercial pipeline view.
   - Opportunity → offer/task actions.
   - Forecast, aging, conversion and margin-risk indicators.

## Delivery strategy

Build in large checkpoints. Every checkpoint must pass TypeScript + production build CI. Production Supabase and main remain untouched until the V8/V9/V10 rollout chain is deliberately approved.
