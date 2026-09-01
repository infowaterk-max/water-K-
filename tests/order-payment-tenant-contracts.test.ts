import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('order and payment tenant contracts',()=>{
  it('requires order permission and tenant scope for order mutation',()=>{
    const source=read('src/app/api/admin/orders/[id]/route.ts');
    expect(source).toContain("getAdminRequestUser('orders.manage')");
    expect(source).toContain("requireCurrentStoreContext('orders.manage')");
    expect(source).toContain(".eq('instance_id',scope.instanceId)");
    expect(source).toContain('instance_id:scope.instanceId');
  });

  it('keeps integration retries inside the order tenant',()=>{
    const source=read('src/app/api/admin/integration-jobs/[id]/retry/route.ts');
    expect(source).toContain("getAdminRequestUser('orders.manage')");
    expect(source).toContain(".eq('instance_id',scope.instanceId)");
    expect(source).toContain('instanceId:scope.instanceId');
  });

  it('derives payment attempt tenant ownership from the order',()=>{
    const source=read('src/lib/integrations/payment-attempts.ts');
    expect(source).toContain('Cross-store payment attempt is not allowed.');
    expect(source).toContain('instance_id:instanceId');
    expect(source).toContain(".eq('instance_id',input.instanceId)");
  });

  it('writes verified payment events only after tenant resolution',()=>{
    const source=read('src/lib/integrations/payment-events.ts');
    expect(source).toContain('Ambiguous payment tenant reference.');
    expect(source).toContain('instance_id:order.instance_id');
    expect(source).toContain('recordWebhookEvent');
  });

  it('uses the global webhook audit for rejected callbacks',()=>{
    const source=read('src/app/api/payments/[provider]/webhook/route.ts');
    expect(source).toContain('recordWebhookEvent');
    expect(source).not.toContain("admin.from('payment_events').insert");
  });

  it('makes payment provider identifiers unique inside a tenant',()=>{
    const sql=read('supabase/migrations/20260901154000_payment_tenant_identity.sql').toLowerCase();
    expect(sql).toContain('payment_attempts_instance_provider_reference_uidx');
    expect(sql).toContain('payment_events_instance_provider_event_uidx');
    expect(sql).toContain('(instance_id,provider_code,provider_reference)');
    expect(sql).toContain('(instance_id,provider_code,provider_event_id)');
  });
});
