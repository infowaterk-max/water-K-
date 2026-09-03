import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20260903094500_external_logistics_email_fulfillment.sql');
const providers=read('src/lib/commerce/providers.ts');
const actions=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
const processor=read('src/lib/integrations/processor.ts');
const paymentEvents=read('src/lib/integrations/payment-events.ts');
const adminOrder=read('src/app/api/admin/orders/[id]/route.ts');
const logistics=read('src/lib/integrations/external-logistics.ts');

describe('external logistics e-mail fulfillment',()=>{
  it('adds a generic shipping provider and governed integration job kind',()=>{
    expect(migration).toContain("'logistics_email'");
    expect(migration).toContain("'external_logistics'");
    expect(migration).toContain("'external_logistics_email'");
    expect(migration).toContain("'home_delivery'");
  });

  it('requires an active tenant connection and valid partner e-mail before checkout exposure',()=>{
    expect(providers).toContain("provider.adapterKey==='external_logistics_email'");
    expect(providers).toContain("provider.connectionStatus==='active'");
    expect(providers).toMatch(/logistics_email/);
    expect(actions).toContain("logistics_email:logisticsEmail");
    expect(actions).toContain("direct_api_contract:false");
    expect(actions).toContain("enabled&&complete?'active':'not_configured'");
  });

  it('processes partner notification as a retryable outbox job',()=>{
    expect(processor).toContain("job.kind==='logistics_email'");
    expect(processor).toContain('sendExternalLogisticsOrderEmail');
    expect(logistics).toContain("kind:'logistics_email'");
    expect(logistics).toContain("Idempotency-Key");
    expect(logistics).toContain('logistics_order_email_sent');
  });

  it('plans logistics notification inside atomic paid/admin order evidence flows',()=>{
    const paymentSql=read('supabase/migrations/20260903192000_payment_event_evidence_atomic_v3.sql');
    expect(paymentEvents).toContain('apply_verified_payment_event_v3');
    expect(paymentSql).toContain("'logistics_email','external_logistics_email'");
    expect(paymentSql).toContain("p.adapter_key='external_logistics_email'");
    expect(adminOrder).toContain('getExternalLogisticsConfig');
    expect(adminOrder).toContain("admin_transition_order_with_outbox_v3");
    expect(adminOrder).toContain("kind:'logistics_email',provider:'external_logistics_email'");
    expect(adminOrder).toContain("current.payment_method==='cash_on_delivery'");
    expect(adminOrder).toContain("current.shipping_method==='external_logistics'&&!external");
  });

  it('partner e-mail contains operational order data needed for fulfillment',()=>{
    for(const token of ['Rendelésszám','Szállítási mód','Címzett','Tételek','SKU','Végösszeg','Csomagpont','Vásárlói megjegyzés']){
      expect(logistics).toContain(token);
    }
  });
});
