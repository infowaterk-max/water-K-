import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903193000_payment_retry_reconciliation_atomic_v2.sql';

describe('payment retry reconciliation atomicity',()=>{
  test('customer retry has one local reconciliation mutation boundary',()=>{
    const route=read('src/app/api/orders/[id]/retry-payment/route.ts');
    expect(route).toContain('reconcile_retry_payment_session_v2');
    expect(route).toContain('mark_payment_attempt_reconciliation_required_v2');
    expect(route).not.toContain('attachPaymentAttemptReference');
    expect(route).not.toContain('markPaymentAttemptRequiresAction');
    expect(route).not.toContain("from('orders').update");
    expect(route).not.toContain("from('order_events').insert");
  });

  test('successful retry binds attempt, order reference and retry event atomically',()=>{
    const sql=read(migration);
    expect(sql).toContain('select * into v_order');
    expect(sql).toContain('for update');
    expect(sql).toContain('update public.payment_attempts');
    expect(sql).toContain('update public.orders');
    expect(sql).toContain("'payment_retried'");
    expect(sql).toContain('PAYMENT_RETRY_EVENT_EVIDENCE_MISSING');
    expect(sql).toContain('PAYMENT_RETRY_PREVIOUS_REFERENCE_STILL_ACTIVE');
  });

  test('retry never replaces a still-active previous payment reference',()=>{
    const sql=read(migration);
    expect(sql).toContain("a.status in ('pending','succeeded','refunded')");
    expect(sql).toContain('PAYMENT_RETRY_PREVIOUS_REFERENCE_STILL_ACTIVE');
    expect(sql).toContain("v_order.status<>'pending_payment'");
  });

  test('reconciliation-required evidence keeps a provider reference when the full transaction cannot finish',()=>{
    const sql=read(migration);
    expect(sql).toContain('mark_payment_attempt_reconciliation_required_v2');
    expect(sql).toContain('provider_reference=coalesce(provider_reference,p_provider_reference)');
    expect(sql).toContain("'reconciliation_required',true");
    expect(sql).toContain("'evidenceSaved',true");
    expect(sql).toContain("v_attempt.status in ('succeeded','failed','cancelled','expired','refunded')");
  });

  test('initial checkout and retry both use the durable reconciliation marker',()=>{
    const initial=read('src/app/api/orders/route.ts');
    const retry=read('src/app/api/orders/[id]/retry-payment/route.ts');
    expect(initial).toContain('mark_payment_attempt_reconciliation_required_v2');
    expect(retry).toContain('mark_payment_attempt_reconciliation_required_v2');
    expect(initial).toContain('checkout payment reconciliation evidence failed');
    expect(retry).toContain('payment retry reconciliation evidence failed');
  });

  test('retry reconciliation RPCs are service-runtime only',()=>{
    const sql=read(migration);
    for(const name of ['reconcile_retry_payment_session_v2','mark_payment_attempt_reconciliation_required_v2']){
      expect(sql).toContain(`revoke all on function public.${name}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]{0,320}to service_role`));
    }
  });
});
