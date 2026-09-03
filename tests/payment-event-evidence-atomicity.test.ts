import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903192000_payment_event_evidence_atomic_v3.sql';

describe('payment event evidence atomicity',()=>{
  test('resolved verified callbacks have one database mutation boundary',()=>{
    const source=read('src/lib/integrations/payment-events.ts');
    expect(source).toContain('apply_verified_payment_event_v3');
    expect(source).toContain('p_instance_id:order.instance_id');
    expect(source).toContain('PAYMENT_EVENT_SIDE_EFFECT_EVIDENCE_MISSING');
    expect(source).not.toContain("from('payment_events').insert");
    expect(source).not.toContain("from('orders').update");
    expect(source).not.toContain("from('order_events').insert");
    expect(source).not.toContain('enqueueIntegrationJob');
    expect(source).not.toContain('enqueueExternalLogisticsOrderEmail');
    expect(source).not.toContain('updatePaymentAttemptFromEvent');
  });

  test('webhook, payment event, attempt, order event and outbox intents commit together',()=>{
    const sql=read(migration);
    expect(sql).toContain('insert into public.webhook_events');
    expect(sql).toContain('insert into public.payment_events');
    expect(sql).toContain('update public.payment_attempts');
    expect(sql).toContain('update public.orders');
    expect(sql).toContain("'payment_confirmed'");
    expect(sql).toContain('private.enqueue_order_integration_intent_v1');
    expect(sql).toContain("jsonb_build_object('template','payment_confirmed')");
    expect(sql).toContain("'invoice_create'");
    expect(sql).toContain("'logistics_email','external_logistics_email'");
    expect(sql).not.toContain('integration_enqueue_failed');
  });

  test('payment replay heals missing local side effects without downgrading later lifecycle state',()=>{
    const sql=read(migration);
    const outboxSql=read('supabase/migrations/20260903174500_order_transition_outbox_atomic_v3.sql');
    expect(sql).toContain("v_order.status in ('pending','pending_payment','pending_transfer')");
    expect(sql).toContain("set paid_at=coalesce(paid_at,v_now)");
    expect(sql).toContain("if v_order.status in ('cancelled','refunded','draft')");
    expect(sql).toContain('PAYMENT_PAID_ORDER_STATE_RECONCILIATION_REQUIRED');
    expect(sql).toContain('private.enqueue_order_integration_intent_v1');
    expect(outboxSql).toContain("status in ('pending','processing','succeeded')");
  });

  test('payment attempts resist out-of-order status downgrades',()=>{
    const sql=read(migration);
    expect(sql).toContain("when p_payment_status='paid' and v_attempt.status<>'refunded' then 'succeeded'");
    expect(sql).toContain("and v_attempt.status not in ('succeeded','refunded')");
    expect(sql).toContain("and v_attempt.status not in ('succeeded','failed','cancelled','expired','refunded')");
  });

  test('verified persistence failures are retryable and are not mislabeled signature failures',()=>{
    const route=read('src/app/api/payments/[provider]/webhook/route.ts');
    expect(route).toContain('verified payment webhook persistence failed');
    expect(route).toContain('A hitelesített fizetési esemény feldolgozása átmenetileg nem sikerült.');
    expect(route).toContain('{status:503}');
    expect(route).toContain('A fizetési webhook hitelesítése sikertelen.');
    expect(route).toContain('{status:401}');
  });

  test('generic webhook IDs are namespaced after tenant resolution',()=>{
    const sql=read(migration);
    const outbox=read('src/lib/integrations/outbox.ts');
    expect(sql).toContain('drop index if exists public.webhook_events_provider_external_uidx');
    expect(sql).toContain('webhook_events_instance_provider_external_uidx');
    expect(sql).toContain('webhook_events_unresolved_provider_external_uidx');
    expect(outbox).toContain(".eq('instance_id',input.instanceId)");
    expect(outbox).toContain(".is('instance_id',null)");
  });

  test('payment event RPC is service-runtime only',()=>{
    const sql=read(migration);
    expect(sql).toContain('revoke all on function public.apply_verified_payment_event_v3');
    expect(sql).toMatch(/grant execute on function public\.apply_verified_payment_event_v3[\s\S]{0,300}to service_role/);
  });
});
