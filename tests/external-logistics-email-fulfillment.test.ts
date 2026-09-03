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

  it('notifies logistics only after confirmed/manual paid flow or COD, and skips carrier API fulfillment',()=>{
    expect(paymentEvents).toContain('enqueueExternalLogisticsOrderEmail');
    expect(adminOrder).toContain('enqueueExternalLogisticsOrderEmail');
    expect(adminOrder).toContain('getExternalLogisticsConfig');
    expect(adminOrder).toContain("&&!externalLogistics");
  });

  it('partner e-mail contains operational order data needed for fulfillment',()=>{
    for(const token of ['Rendelésszám','Szállítási mód','Címzett','Tételek','SKU','Végösszeg','Csomagpont','Vásárlói megjegyzés']){
      expect(logistics).toContain(token);
    }
  });
});
