# Water-K V10 readiness

## Scope
V10 builds on the audited V9 head and adds controlled commercial automation: unified B2C/B2B opportunities, governed offers, human sales tasks, pipeline forecasting, conversion metrics and aging decision support.

## Implemented migrations
- 067 commercial opportunities
- 068 governed offers and sales tasks
- 069 offer lifecycle and offer forecast
- 070 pipeline aging, conversion and executive forecast
- 071 opportunity planner integrity
- 072 offer/opportunity lifecycle integrity
- 073 sales-task lifecycle integrity

## Audit findings and fixes
- Prevented multiple active automatic opportunities for the same B2C customer / B2B reorder context.
- Prevented offer creation for closed opportunities at database level.
- Accepting an offer now closes sibling active offers and marks the opportunity won.
- High-value generated sales tasks are idempotent by task key and stale tasks are cancelled when the opportunity closes.
- Offer approval snapshots price, unit cost, margin and total value only after margin guard approval.
- Privileged planner and lifecycle functions are service-role only and use pinned/empty search_path.
- Commercial tables use RLS and deny anon/authenticated direct access.
- Forecast and conversion views use security_invoker and service-role-only SELECT.

## CI
The pre-readiness audit head passed dependency install, TypeScript check and production build. The final readiness documentation commit requires its own final CI before V10 is marked fully green.

## Rollout
No production/main deployment or Supabase migration is performed by this checkpoint. V10 remains isolated on feature/native-store-v10 until the rollout chain is explicitly approved.
