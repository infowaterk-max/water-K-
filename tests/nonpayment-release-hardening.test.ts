import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('non-payment release hardening',()=>{
  test('transactional order e-mail is background-safe, tenant branded and idempotent',()=>{
    const email=read('src/lib/integrations/email.ts');
    const processor=read('src/lib/integrations/processor.ts');
    expect(email).toContain('identity:CommunicationIdentity');
    expect(email).not.toContain('getCommunicationIdentity()');
    expect(email).toContain('const identity=input.identity');
    expect(processor).toContain('getCommunicationIdentityForInstance(instanceId)');
    expect(processor).toContain('idempotencyKey:`order-email:${instanceId}:${job.order_id}:${template}`');
    expect(email).toContain('safeName');
  });

  test('automatic invoicing requires an active tenant provider connection',()=>{
    const invoicing=read('src/lib/integrations/invoicing.ts');
    const processor=read('src/lib/integrations/processor.ts');
    const events=read('src/lib/integrations/payment-events.ts');
    const adminOrder=read('src/app/api/admin/orders/[id]/route.ts');
    const retry=read('src/app/api/admin/integration-jobs/[id]/retry/route.ts');
    expect(invoicing).toContain('getConfiguredInvoiceProviderCodeForInstance');
    expect(invoicing).toContain("eq('instance_id',instanceId)");
    expect(invoicing).toContain("connection.connection_status!=='active'");
    expect(invoicing).not.toContain('SZAMLAZZ_CONNECTION_VERIFIED');
    expect(processor).toContain('Invoice provider is not active for this webshop');
    expect(events).toContain('getConfiguredInvoiceProviderCodeForInstance(order.instance_id,{strict:true})');
    expect(adminOrder).toContain('getConfiguredInvoiceProviderCodeForInstance(scope.instanceId,{strict:true})');
    expect(retry).toContain('getConfiguredInvoiceProviderCodeForInstance(scope.instanceId)');
  });

  test('bank transfer is not exposed until tenant instructions are complete',()=>{
    const providers=read('src/lib/commerce/providers.ts');
    const actions=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    const page=read('src/app/admin/beallitasok/fizetes-szallitas/page.tsx');
    const email=read('src/lib/integrations/email.ts');
    const success=read('src/app/rendeles-sikeres/page.tsx');
    expect(providers).toContain("provider.code==='bank_transfer'");
    expect(providers).toContain('getBankTransferInstructionsForInstance');
    expect(actions).toContain("bankTransfer=providerCode==='bank_transfer'");
    expect(page).toContain('Bankszámlaszám / IBAN');
    expect(email).toContain('Banki átutalás adatai');
    expect(success).toContain('Közlemény:');
  });

  test('customer-facing order tokens and account pages bind the current tenant',()=>{
    const success=read('src/app/rendeles-sikeres/page.tsx');
    const attribution=read('src/app/api/orders/attribution/route.ts');
    const retry=read('src/app/api/orders/[id]/retry-payment/route.ts');
    const detail=read('src/app/fiokom/rendeles/[id]/page.tsx');
    const returns=read('src/app/fiokom/visszakuldes/page.tsx');
    expect(success).toMatch(/orders'[\s\S]*eq\('instance_id',instance\.id\)[\s\S]*confirmation_token/);
    expect(attribution).toMatch(/orders'[\s\S]*eq\('instance_id',instance\.id\)[\s\S]*confirmation_token/);
    expect(retry).toMatch(/orders'[\s\S]*eq\('instance_id',instance\.id\)[\s\S]*customer_id/);
    expect(detail).toMatch(/order_items'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(detail).toMatch(/order_events'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(returns).toMatch(/orders'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(returns).toMatch(/return_cases'[\s\S]*eq\('instance_id',instance\.id\)/);
  });

  test('checkout and retry audit events satisfy strict tenant ownership',()=>{
    const order=read('src/app/api/orders/route.ts');
    const checkoutSql=read('supabase/migrations/20260903190000_checkout_local_evidence_atomic_v2.sql');
    const retry=read('src/app/api/orders/[id]/retry-payment/route.ts');
    expect(order).toContain('finalize_checkout_local_v2');
    expect(order).toContain('reconcile_checkout_payment_session_v2');
    expect(order).not.toContain("from('order_events').insert");
    expect(checkoutSql).toContain("'legal_terms_accepted'");
    expect(checkoutSql).toContain("'payment_recovered'");
    expect(checkoutSql).toContain("'payment_started'");
    expect(retry).toMatch(/order_events'\)\.insert\(\{instance_id:instance\.id/);
  });
});
