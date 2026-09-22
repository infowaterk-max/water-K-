# Water-K V12 readiness

## Scope
V12 turns the native commerce stack into an operational command system covering order operations, checkout-committed inventory, fulfillment, returns/service exceptions, SLA aging and high-value handling.

## Implemented migrations
- 084 inventory reservation ledger, operations state and ATP foundation
- 085 fulfillment lifecycle and event log
- 086 reservation reconciliation and inventory summary
- 087 reservation / fulfillment integrity hardening
- 088 alignment with legacy checkout stock semantics
- 089 order-state guards, service/return reconciliation and priority model
- 090 idempotent operations orchestration
- 091 refund recovery and operational exception / inventory pressure views
- 092 aggregate refund inventory restoration integrity

## Critical audit findings resolved
- The existing checkout already decrements `product_variants.stock_quantity` at order creation. V12 no longer decrements stock again at `packed`.
- ATP now represents checkout-free stock; estimated on-hand adds active operational reservations back for warehouse visibility.
- Cancellation restores checkout-committed stock only before carrier handover; dispatched/delivered orders must use the return/refund flow.
- Fully refunded pre-fulfillment orders restore remaining checkout-committed stock exactly once, including orders without a V12 reservation backfill.
- Refund restoration is aggregated by order + variant to prevent duplicate restoration when a SKU appears on multiple order lines.
- Physical return restocking continues to use the existing verified `restock_return_case` flow; V12 does not auto-restock dispatched goods.
- Fulfillment transitions are strict and idempotent: reserved -> ready_to_pack -> packed -> handed_over -> delivered.
- Handed-over and delivered operations synchronize commerce state to shipped/completed.
- Event keys are owned by order + transition and cannot be replayed for a different operation.
- Impossible commerce regressions and cancellation after carrier handover are blocked at database level.
- Support/return signals increase operations priority only; they do not penalize customer value or eligibility.

## Security
- V12 operational tables use RLS.
- Direct anon/authenticated access to privileged operational tables is revoked.
- Privileged functions use `security definer` with an empty pinned search path and service-role-only EXECUTE.
- Operational read models use `security_invoker=true` and service-role-only SELECT.
- Admin mutation endpoints authenticate the current user and require the admin role before using the service-role client.

## Admin experience
`/admin/muveletek` provides:
- operations KPIs and SLA aging
- blocked / high-value / service-attention visibility
- order progression controls
- idempotent reconciliation cycle trigger
- checkout-free ATP and estimated physical inventory visibility

## Verification
- V12 is isolated on `feature/native-store-v12` and PR #12 targets the CI-green V11 readiness branch.
- GitHub CI covers dependency installation, TypeScript and production build.
- Database migration behavior has been statically audited against the existing checkout, cancellation, return/refund and restock functions.
- No production Supabase migration, main merge, or production/Vercel deployment is performed by this checkpoint.

## Remaining rollout condition
V12 is readiness-green only after the final documentation head passes GitHub TypeScript + production build CI. Production rollout remains a separate explicitly approved action.
