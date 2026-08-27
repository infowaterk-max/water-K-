# Native Store V8 – readiness checkpoint

## Status

V8 feature scope is frozen at this checkpoint. The branch is intentionally **not deployed** and the production Supabase database is intentionally **not migrated** yet.

The codebase must remain on `feature/native-store-v8` until the final deployment window is approved.

## Functional scope completed

- Historical order-item cost snapshots and COGS-quality tracking.
- Gross-margin, channel/customer profitability, inventory capital and GMROI decision views.
- Inventory risk ranking and financially prioritized replenishment suggestions.
- Lead-time, safety-stock, MOQ and supplier-order-multiple procurement planning.
- Purchase-order workflow with draft, approval, ordered, partial receipt, full receipt and cancellation states.
- Atomic purchase-order creation, supplier identity handling, state transitions and inventory receipts.
- Cash-flow / procurement capital decision support.
- Item-level returns, cumulative returned-quantity guards, refund-total guards and controlled inventory restocking.
- Atomic return request creation and return-case state transitions.
- Customer-service tickets with threaded customer/admin conversation and database-level closed-thread integrity.
- Marketing consent ledger, campaign queue, suppression list and communication worker recovery.
- Resend communication provider, signed one-click marketing unsubscribe and signed Resend webhook handling.
- Transactional notifications for support replies and return-status updates, without marketing-style manual approval blocking.
- SECURITY DEFINER hardening for V8 communication/inventory functions with pinned empty search paths.
- Manual fulfillment fallback for provider integrations that are not contract/API-ready.

## Database migration order

Production deployment must apply all not-yet-applied migrations strictly by filename order. V8-specific migrations currently continue through:

- `018_product_unit_cost.sql`
- `019_inventory_snapshots.sql`
- `025_marketing_consent.sql` … `037_order_item_cost_snapshot.sql`
- `038_returns_service.sql`
- `039_support_tickets.sql`
- `040_procurement_planning.sql`
- `041_procurement_workflow.sql`
- `042_support_conversations.sql`
- `043_return_case_items.sql`
- `044_cancelled_order_stock_restore.sql`
- `045_return_integrity_guards.sql`
- `046_procurement_receipt_integrity.sql`
- `047_procurement_creation_integrity.sql`
- `048_supplier_identity_integrity.sql`
- `049_procurement_state_integrity.sql`
- `050_return_request_atomicity.sql`
- `051_return_transition_atomicity.sql`
- `052_support_thread_integrity.sql`
- `053_partial_procurement_receipts.sql`
- `054_support_closed_thread_guard.sql`
- `055_communication_delivery_integrity.sql`

Do not cherry-pick individual V8 migrations into production. Apply the branch as one tested migration set.

## Required environment configuration before enabling V8 communication

- `CRON_SECRET`
- `COMMUNICATION_WORKER_SECRET`
- `COMMUNICATION_WEBHOOK_SECRET` – use the Resend webhook signing secret (`whsec_...`) for direct Resend webhook delivery.
- `COMMUNICATION_UNSUBSCRIBE_SECRET` – long random server-only secret used for signed unsubscribe links.
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_SITE_URL`

Payment, courier and invoicing provider credentials stay provider-specific and can remain unavailable while manual fulfillment fallback is used.

## Final pre-deploy verification matrix

1. Run `npm run typecheck` and `npm run build` on the exact deployment commit.
2. Apply the complete migration set to a disposable/staging Supabase project first.
3. Create a retail order and a reseller order; verify price snapshots, cost snapshots and stock deduction.
4. Cancel an order; verify stock and coupon usage restoration exactly once.
5. Exercise paid → processing → shipped → completed and confirm required tracking protection.
6. Create purchase order → approve → order → partial receipt → final receipt; verify stock events and no over-receipt.
7. Create partial return; verify cumulative quantity guard, refund ceiling and one-time restock.
8. Open a support ticket; exchange customer/admin messages; verify closed-thread protection including concurrent close/reply races.
9. Grant and withdraw marketing consent; verify marketing jobs are blocked after withdrawal while transactional communication remains immediately deliverable unless the address is globally suppressed.
10. Verify marketing jobs remain approval-gated; verify Resend delivery, bounce/complaint webhook suppression and one-click unsubscribe on staging.
11. Compare dashboard revenue/COGS/margin/inventory metrics against hand-calculated test orders.
12. Only after the checks above: merge V8, apply production migrations, configure production secrets and deploy.

## Explicitly out of V8 scope

V8 does not attempt to become an accounting/ERP product. General ledger, statutory accounting, VAT return preparation, bank reconciliation, payroll, full supplier accounting and warehouse-management-system complexity remain outside this webshop scope.
