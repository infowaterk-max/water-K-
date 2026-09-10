import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';
import{
  ADMIN_ORDER_MUTATION_STATUSES,
  ADMIN_ORDER_TRANSITIONS,
  ORDER_LIFECYCLE_STATUSES,
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_STATES,
  canAdminTransitionOrder,
  isTerminalPaymentAttemptStatus,
  paymentAttemptStatusFromEvent,
}from'../src/lib/orders/orchestration-contract';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

const orderOutboxMigration='supabase/migrations/20260903174500_order_transition_outbox_atomic_v3.sql';
const paymentEventMigration='supabase/migrations/20260903192000_payment_event_evidence_atomic_v3.sql';
const paymentRetryMigration='supabase/migrations/20260903193000_payment_retry_reconciliation_atomic_v2.sql';
const manualRefundMigration='supabase/migrations/20260905104500_admin_manual_refund_order_v1.sql';

describe('Roadmap Block 13 order orchestration and payment contract',()=>{
  test('defines one canonical order lifecycle and keeps refund outside generic admin mutation',()=>{
    expect(ORDER_LIFECYCLE_STATUSES).toEqual([
      'draft','pending','pending_payment','pending_transfer','paid','processing','shipped','completed','cancelled','refunded'
    ]);
    expect(ADMIN_ORDER_MUTATION_STATUSES).not.toContain('refunded');
    expect(ADMIN_ORDER_TRANSITIONS.pending_payment).toEqual(['paid','cancelled']);
    expect(ADMIN_ORDER_TRANSITIONS.pending_transfer).toEqual(['paid','cancelled']);
    expect(ADMIN_ORDER_TRANSITIONS.processing).toEqual(['shipped']);
    expect(canAdminTransitionOrder('paid','processing')).toBe(true);
    expect(canAdminTransitionOrder('processing','paid')).toBe(false);
    expect(canAdminTransitionOrder('completed','completed')).toBe(true);

    const sharedTypes=read('src/lib/orders/types.ts');
    const lifecycle=read('src/lib/orders/lifecycle.ts');
    const adminRoute=read('src/app/api/admin/orders/[id]/route.ts');
    expect(sharedTypes).toContain("OrderStatus=OrderLifecycleStatus");
    expect(sharedTypes).not.toContain("OrderStatus='draft'");
    expect(lifecycle).toContain("OrderLifecycleStatus}from'@/lib/orders/orchestration-contract'");
    expect(adminRoute).toContain('ADMIN_ORDER_MUTATION_STATUSES');
    expect(adminRoute).toContain('canAdminTransitionOrder(currentStatus,nextStatus)');
    expect(adminRoute).toContain('ADMIN_ORDER_TRANSITIONS[nextStatus]');
    expect(adminRoute).not.toContain("const statuses=['draft'");
    expect(adminRoute).not.toContain('const allowed:Record<');
  });

  test('defines provider-neutral payment event and attempt state semantics once',()=>{
    expect(PAYMENT_STATES).toEqual(['pending','paid','failed','cancelled','refunded','unknown']);
    expect(PAYMENT_ATTEMPT_STATUSES).toEqual(['created','pending','requires_action','succeeded','failed','cancelled','expired','refunded']);
    expect(paymentAttemptStatusFromEvent('paid')).toBe('succeeded');
    expect(paymentAttemptStatusFromEvent('pending')).toBe('pending');
    expect(paymentAttemptStatusFromEvent('unknown')).toBeNull();
    expect(isTerminalPaymentAttemptStatus('succeeded')).toBe(true);
    expect(isTerminalPaymentAttemptStatus('requires_action')).toBe(false);

    const adapterTypes=read('src/lib/integrations/types.ts');
    const attempts=read('src/lib/integrations/payment-attempts.ts');
    const events=read('src/lib/integrations/payment-events.ts');
    expect(adapterTypes).toContain("PaymentState}from'@/lib/orders/orchestration-contract'");
    expect(attempts).toContain('paymentAttemptStatusFromEvent(input.status)');
    expect(attempts).toContain('isTerminalPaymentAttemptStatus(mapped)');
    expect(attempts).toContain('status:PaymentState');
    expect(events).toContain("PaymentState}from'@/lib/orders/orchestration-contract'");
    expect(events).not.toContain("export type PaymentState='pending'");
  });

  test('keeps admin transition, audit and required integration plan atomic and tenant-authorized',()=>{
    const route=read('src/app/api/admin/orders/[id]/route.ts');
    const sql=read(orderOutboxMigration);
    expect(route).toContain("getAdminRequestUser('orders.manage')");
    expect(route).toContain("requireCurrentStoreContext('orders.manage')");
    expect(route).toContain(".eq('id',id).eq('instance_id',scope.instanceId)");
    expect(route).toContain("admin.rpc('admin_transition_order_with_outbox_v3'");
    expect(route).toContain('p_instance_id:scope.instanceId');
    expect(route).toContain('transition.orderId!==id||transition.status!==nextStatus');
    expect(route).toContain('jobEvidenceOk');
    expect(route).toContain('eventEvidenceOk');

    expect(sql).toContain('public.can_manage_orders(p_instance_id,p_actor)');
    expect(sql).toContain('public.admin_transition_order_v2(');
    expect(sql).toContain('insert into public.integration_jobs');
    expect(sql).toContain('ORDER_OUTBOX_JOB_EVIDENCE_MISSING');
    expect(sql).toContain('ORDER_MANUAL_EVENT_EVIDENCE_MISSING');
    expect(sql).toContain('revoke all on function public.admin_transition_order_with_outbox_v3');
    expect(sql).toContain('to service_role');
  });

  test('persists verified payment callbacks atomically and makes local persistence failure retryable',()=>{
    const source=read('src/lib/integrations/payment-events.ts');
    const webhook=read('src/app/api/payments/[provider]/webhook/route.ts');
    const sql=read(paymentEventMigration);

    expect(source).toContain('Ambiguous payment tenant reference.');
    expect(source).toContain("admin.rpc('apply_verified_payment_event_v3'");
    expect(source).toContain('PAYMENT_EVENT_SIDE_EFFECT_EVIDENCE_MISSING');
    expect(webhook).toContain('verified payment webhook persistence failed');
    expect(webhook).toContain("status:503");
    expect(webhook).toContain('verifyCallback');

    expect(sql).toContain('insert into public.payment_events');
    expect(sql).toContain('update public.payment_attempts');
    expect(sql).toContain('update public.orders');
    expect(sql).toContain("insert into public.order_events");
    expect(sql).toContain('private.enqueue_order_integration_intent_v1');
    expect(sql).toContain('PAYMENT_EVENT_REPLAY_CONFLICT');
    expect(sql).toContain('PAYMENT_EVENT_STATUS_REPLAY_CONFLICT');
    expect(sql).toContain('PAYMENT_PAID_ORDER_STATE_RECONCILIATION_REQUIRED');
    expect(sql).toContain('revoke all on function public.apply_verified_payment_event_v3');
    expect(sql).toContain('to service_role');
  });

  test('keeps customer payment retry tenant-scoped, duplicate-safe and durably reconcilable',()=>{
    const route=read('src/app/api/orders/[id]/retry-payment/route.ts');
    const sql=read(paymentRetryMigration);

    expect(route).toContain(".eq('instance_id',instance.id)");
    expect(route).toContain(".eq('customer_id',user.id)");
    expect(route).toContain("order.status!=='pending_payment'");
    expect(route).toContain("admin.rpc('reconcile_retry_payment_session_v2'");
    expect(route).toContain("admin.rpc('mark_payment_attempt_reconciliation_required_v2'");
    expect(route).toContain("status:503");

    expect(sql).toContain("v_order.status<>'pending_payment'");
    expect(sql).toContain('PAYMENT_RETRY_PREVIOUS_REFERENCE_STILL_ACTIVE');
    expect(sql).toContain("a.status in ('pending','succeeded','refunded')");
    expect(sql).toContain("status='requires_action'");
    expect(sql).toContain("'reconciliation_required',true");
    expect(sql).toContain("v_attempt.status in ('succeeded','failed','cancelled','expired','refunded')");
    expect(sql).toContain("'payment_retried'");
    expect(sql).toContain('revoke all on function public.reconcile_retry_payment_session_v2');
    expect(sql).toContain('revoke all on function public.mark_payment_attempt_reconciliation_required_v2');
  });

  test('keeps refunds behind the dedicated financial and return boundary',()=>{
    const adminRoute=read('src/app/api/admin/orders/[id]/route.ts');
    const refundRoute=read('src/app/api/admin/orders/[id]/refund/route.ts');
    const refundSql=read(manualRefundMigration);

    expect(adminRoute).toContain('Visszatérítést csak a fizetési/visszáru folyamaton keresztül lehet rögzíteni.');
    expect(refundRoute).toContain("manualPaymentMethods=new Set(['cash_on_delivery','bank_transfer'])");
    expect(refundRoute).toContain('Online fizetésnél a visszatérítést a fizetési szolgáltató ellenőrzött refund-folyamatán keresztül kell végrehajtani.');
    expect(refundRoute).toContain('providerRefundTriggered:false');
    expect(refundSql).toContain("'providerRefundTriggered',false");
    expect(refundSql).toContain("'financial_refund_only; pre-fulfillment inventory reconciliation remains separate'");
  });

  test('does not invent a Block 13 schema migration or invalidate the proven customer baseline',()=>{
    const productionMigrations=fs.readdirSync(path.join(root,'supabase/migrations'));
    const customerMigrations=fs.readdirSync(path.join(root,'supabase/customer-baseline/migrations'));
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as{status?:string;freshInstallProofRequired?:boolean;proofContractSha256?:string|null};
    expect(productionMigrations.some(name=>/block13/i.test(name))).toBe(false);
    expect(customerMigrations.some(name=>/block13/i.test(name))).toBe(false);
    expect(manifest.status).toBe('ready');
    expect(manifest.freshInstallProofRequired).toBe(false);
    expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);

    const doc=read('docs/ROADMAP_BLOCK13_ORDER_ORCHESTRATION_PAYMENT_CONTRACT.md');
    expect(doc).toContain('No new database schema is required');
    expect(doc).toContain('0001–0008');
    expect(doc).toContain('Roadmap Block 21');
    expect(doc).toContain('Roadmap Block 22');
  });
});
