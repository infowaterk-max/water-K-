# Native Store V9 – readiness audit

## Scope
V9 is developed on `feature/native-store-v9` and intentionally targets the V8 feature branch. Production Supabase remains unchanged.

## Implemented V9 areas
- Customer LTV, AOV, recency, frequency and segmentation.
- Retention, replenishment, win-back and abandoned-checkout journeys.
- Authenticated checkout recovery with expiring token and order conversion link.
- Promotion contribution-margin guard and admin simulator.
- Reseller reorder cadence, priority scoring and revenue opportunity model.
- Growth dashboard and executive B2C/B2B retention/cohort analytics.

## Audit results
- V9 migrations continue after V8 migration 055 through migration 066.
- V9 state-changing SECURITY DEFINER functions are service-role only and use pinned/empty search paths where applicable.
- Journey dispatch uses row locking with `SKIP LOCKED` and idempotent communication keys.
- Marketing jobs require consent and suppression clearance at enqueue time.
- Communication worker re-checks suppression and marketing consent immediately before provider send.
- Transactional communication does not depend on marketing consent.
- Checkout recovery is converted immediately after successful authenticated order creation, before later confirmation/integration work.
- Promotion margin guard rejects invalid percentages, missing unit cost and below-floor contribution margin.
- Reseller priority model is read-only and service-role exposed.
- Executive analytics views are read-only, security-invoker views exposed to service role only.

## Remaining runtime validation
A disposable/staging database is still recommended before production migration to execute the full migration chain and runtime business-flow matrix. No V9 migration should be applied individually to production before the V8 rollout is complete.

## Readiness checkpoint
Code/static audit complete. Final TypeScript and production build CI must be green on the readiness head before marking V9 ready for review.
