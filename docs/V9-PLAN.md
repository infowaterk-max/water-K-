# Native Store V9 – development plan

## Starting point

V9 starts from the exact V8 readiness head (`c4a1d3b12ed1bfaccedbb46249d4682cc164a7ec`) on `feature/native-store-v9`.
V8 remains isolated in PR #8 and production Supabase stays unchanged until its separate deployment window.

## V9 product direction

V9 focuses on commercial growth, customer retention and operational automation without turning the webshop into a full ERP.

### 1. Customer lifetime value and segmentation
- Customer-level LTV, AOV, order frequency and recency metrics.
- Actionable segments: first-time, repeat, VIP, at-risk, dormant, reseller.
- Admin customer detail enriched with revenue, gross margin and last activity.

### 2. Automated retention journeys
- Event-driven post-purchase, replenishment and win-back journeys.
- Marketing journeys remain consent-gated and suppression-aware.
- Transactional journeys never depend on marketing consent.
- Idempotent journey enrollment and delivery jobs.

### 3. Abandoned checkout recovery
- Persist recoverable checkout intent for authenticated users.
- Expiring recovery tokens.
- Admin visibility into recoverable vs converted checkouts.
- Optional consent-gated abandoned-checkout reminder.

### 4. Promotion and merchandising intelligence
- Product-level contribution margin and promo-floor guardrails.
- Admin promotion simulator before coupons/campaigns go live.
- Prevent discount proposals that fall below configured minimum contribution margin.

### 5. Reseller growth controls
- Reseller-specific performance and reorder history.
- Reorder suggestions based on historical cadence.
- Admin view for dormant/high-value reseller accounts.

### 6. Operational dashboard V9
- Revenue, COGS, gross margin, AOV, repeat-rate, LTV and retention cohorts.
- Separate retail/reseller views.
- Decision cards for at-risk revenue, reorder opportunities and low-margin promotions.

## Engineering guardrails

- No V9 migration is applied to production while V8 is not deployed.
- New migrations continue strictly after V8 migration `055`.
- New business-critical state changes must be atomic at database level.
- Marketing communication must pass consent and suppression checks at enqueue and send time.
- All externally triggerable admin operations require server-side admin authorization.
- Idempotency is required for automated journeys, recovery jobs and webhook-driven state transitions.
- TypeScript and production build must pass before the V9 readiness PR.

## First implementation pack

The first V9 development pack should implement:
1. Customer metrics/LTV materialization or query layer.
2. Customer segmentation engine.
3. Admin customer intelligence page integration.
4. Journey/enrollment database model with idempotent scheduling primitives.
5. Abandoned checkout persistence foundation.
6. Initial V9 dashboard decision cards.

After this pack, run a structural audit before adding further automation.
