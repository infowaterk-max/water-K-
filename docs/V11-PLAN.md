# Water-K V11 – Customer value, loyalty and lifecycle roadmap

V11 starts from the audited V10 readiness head. It focuses on converting the commerce intelligence and controlled sales automation layers into a durable customer-value system without relying on uncontrolled discounting.

## Objectives

1. **Customer value engine**
   - Unified customer value profile from orders, retention, recovery and commercial outcomes.
   - Recency/frequency/value and lifecycle signals.
   - Explicit value tiers with deterministic recalculation.

2. **Loyalty ledger**
   - Auditable earn/redeem/expire/adjust ledger instead of mutable point balances.
   - Idempotent earning from eligible paid orders.
   - Reversal support for refunds/cancellations.
   - Configurable rules and caps.

3. **Benefit governance**
   - Benefits based on tier/value, not automatic blanket discounts.
   - Margin guard integration for monetary rewards.
   - Eligibility, validity window, usage limits and audit trail.

4. **Lifecycle orchestration**
   - First-order, repeat-order, high-value, at-risk and win-back milestones.
   - Human review for high-value B2B/customer interventions where appropriate.
   - Reuse V9 consent/suppression and V10 opportunity controls.

5. **Customer/admin experience**
   - Customer account value/loyalty summary.
   - Admin customer-value dashboard with tier distribution, liabilities, redemption, repeat rate and retention indicators.

6. **Safety and rollout**
   - RLS and service-role-only privileged mutations.
   - Idempotent planners and immutable ledger entries.
   - Large checkpoints with TypeScript + production build verification.
   - No production/main deployment while Vercel build rate limiting is active.
