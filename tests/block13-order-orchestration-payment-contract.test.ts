import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const adminRoute=read('src/app/api/admin/orders/[id]/route.ts');
const refundRoute=read('src/app/api/admin/orders/[id]/refund/route.ts');
const refundSql=read('supabase/migrations/20260910200700_block13_refund_contract.sql');

describe('Roadmap Block 13 order orchestration and payment contract',()=>{
  test('keeps order lifecycle vocabulary and admin transitions canonical',()=>{
    const lifecycle=read('src/lib/orders/lifecycle.ts');
    for(const state of['pending','confirmed','processing','shipped','delivered','cancelled'])expect(lifecycle).toContain(`'${state}'`);
    expect(adminRoute).toContain('canTransitionOrderStatus');
    expect(adminRoute).toContain("getAdminRequestUser('orders.manage')");
    expect(adminRoute).toContain("requireCurrentStoreContext('orders.manage')");
  });

  test('keeps payment attempts provider neutral and server-authoritative',()=>{
    const payments=read('src/lib/orders/payment-contract.ts');
    for(const state of['pending','requires_action','processing','succeeded','failed','cancelled'])expect(payments).toContain(`'${state}'`);
    expect(payments).toContain('PaymentAttemptState');
    expect(payments).toContain('PaymentState');
  });

  test('keeps verified callback and payment retry/reconciliation evidence durable',()=>{
    const callback=read('src/app/api/payments/callback/[provider]/route.ts');
    const retry=read('src/app/api/orders/[id]/payment/retry/route.ts');
    const reconcile=read('src/app/api/admin/orders/[id]/payment/reconcile/route.ts');
    expect(callback).toContain('verified');expect(callback).toContain('503');
    expect(retry).toContain('requires_action');expect(reconcile).toContain('reconcile');
  });

  test('keeps refunds outside the generic order status mutation path',()=>{
    expect(adminRoute).toContain('Visszatérítést csak a fizetési/visszáru folyamaton keresztül lehet rögzíteni.');
    expect(refundRoute).toContain("manualPaymentMethods=new Set(['cash_on_delivery','bank_transfer'])");
    expect(refundRoute).toContain('Online fizetésnél a visszatérítést a fizetési szolgáltató ellenőrzött refund-folyamatán keresztül kell végrehajtani.');
    expect(refundRoute).toContain('providerRefundTriggered:false');
    expect(refundSql).toContain("'providerRefundTriggered',false");
    expect(refundSql).toContain("'financial_refund_only; pre-fulfillment inventory reconciliation remains separate'");
  });

  test('does not invent a Block 13 schema migration and only treats the Block 13 proof as current until a later schema block invalidates it',()=>{
    const productionMigrations=fs.readdirSync(path.join(root,'supabase/migrations'));
    const customerMigrations=fs.readdirSync(path.join(root,'supabase/customer-baseline/migrations'));
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as{status?:string;freshInstallProofRequired?:boolean;proofContractSha256?:string|null};
    expect(productionMigrations.some(name=>/block13/i.test(name))).toBe(false);
    expect(customerMigrations.some(name=>/block13/i.test(name))).toBe(false);
    expect(['ready','snapshot-reviewed']).toContain(manifest.status);
    if(manifest.status==='ready'){
      expect(manifest.freshInstallProofRequired).toBe(false);
      expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);
    }else{
      expect(manifest.freshInstallProofRequired).toBe(true);
      expect(manifest.proofContractSha256).toBeNull();
      expect(customerMigrations.some(name=>/^0009_block14_/i.test(name))).toBe(true);
    }

    const doc=read('docs/ROADMAP_BLOCK13_ORDER_ORCHESTRATION_PAYMENT_CONTRACT.md');
    expect(doc).toContain('No new database schema is required');
    expect(doc).toContain('0001–0008');
    expect(doc).toContain('Roadmap Block 21');
    expect(doc).toContain('Roadmap Block 22');
  });
});