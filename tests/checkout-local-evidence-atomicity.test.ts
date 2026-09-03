import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903190000_checkout_local_evidence_atomic_v2.sql';

describe('checkout local evidence atomicity',()=>{
  test('checkout route has no direct post-order business writes',()=>{
    const route=read('src/app/api/orders/route.ts');
    expect(route).toContain('finalize_checkout_local_v2');
    expect(route).toContain('reconcile_checkout_payment_session_v2');
    expect(route).not.toContain("from('orders').update");
    expect(route).not.toContain("from('order_events').insert");
    expect(route).not.toContain('enqueueIntegrationJob');
    expect(route).not.toContain('enqueueExternalLogisticsOrderEmail');
    expect(route).not.toContain('attachPaymentAttemptReference');
  });

  test('local finalizer binds the idempotent order and commits legal/outbox/recovery evidence',()=>{
    const sql=read(migration);
    expect(sql).toContain("md5(p_instance_id::text||':'||trim(p_idempotency_key))");
    expect(sql).toContain("response->>'order_id'=p_order_id::text");
    expect(sql).toContain("'legal_terms_accepted'");
    expect(sql).toContain('private.enqueue_order_integration_intent_v1');
    expect(sql).toContain("'order_confirmation'");
    expect(sql).toContain('public.convert_checkout_recovery_intent_v2');
    expect(sql).toContain('CHECKOUT_FINALIZE_CONFIRMATION_JOB_MISSING');
  });

  test('replay cannot downgrade a later order lifecycle state',()=>{
    const sql=read(migration);
    expect(sql).toContain("if v_order.status='pending' and p_target_status<>'pending'");
    expect(sql).toContain("v_order.status::text in ('pending_payment','pending_transfer')");
    expect(sql).toContain('CHECKOUT_FINALIZE_STATUS_CONFLICT');
    expect(sql).not.toMatch(/update public\.orders[\s\S]{0,300}set status=p_target_status[\s\S]{0,300}where id=p_order_id[\s\S]{0,300}status not in/);
  });

  test('external payment session reconciliation is one local database transaction',()=>{
    const sql=read(migration);
    expect(sql).toContain('select * into v_attempt');
    expect(sql).toContain('for update');
    expect(sql).toContain('update public.payment_attempts');
    expect(sql).toContain('update public.orders');
    expect(sql).toContain("'payment_started'");
    expect(sql).toContain("'payment_recovered'");
    expect(sql).toContain('PAYMENT_SESSION_ATTEMPT_REFERENCE_CONFLICT');
    expect(sql).toContain('PAYMENT_SESSION_ORDER_REFERENCE_CONFLICT');
    expect(sql).toContain('PAYMENT_SESSION_EVENT_MISSING');
  });

  test('checkout finalizer and payment reconciliation are service-runtime only',()=>{
    const sql=read(migration);
    for(const name of ['finalize_checkout_local_v2','reconcile_checkout_payment_session_v2']){
      expect(sql).toContain(`revoke all on function public.${name}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]{0,260}to service_role`));
    }
  });
});
