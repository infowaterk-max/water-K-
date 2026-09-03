import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('final functional and UX audit batch',()=>{
  test('customer order display covers payment-wait states and enabled provider labels',()=>{
    const display=read('src/lib/order-display.ts');
    expect(display).toContain("pending_payment:'Fizetésre vár'");
    expect(display).toContain("pending_transfer:'Átutalásra vár'");
    expect(display).toContain("stripe:'Stripe bankkártya'");
    expect(display).toContain("simplepay:'SimplePay bankkártya'");
    expect(display).toContain("barion:'Barion bankkártya'");
    expect(display).toContain("packeta:'Packeta'");
    expect(display).toContain("dpd:'DPD'");
    expect(display).toContain("expressone:'Express One'");
  });

  test('admin order list explicitly binds every query to the current webshop',()=>{
    const page=read('src/app/admin/rendelesek/page.tsx');
    expect(page).toContain("requireCurrentStoreContext('orders.manage')");
    expect(page).toContain("eq('instance_id',store.instanceId)");
    expect(page).toContain('paymentMethodLabel(o.payment_method)');
    expect(page).toContain('shippingMethodLabel(o.shipping_method)');
  });

  test('storefront copy does not expose internal tenant terminology',()=>{
    const checkout=read('src/components/checkout/checkout-form.tsx');
    const catalog=read('src/components/catalog/shop-catalog.tsx');
    expect(checkout).toContain('Webshopra szabott kedvezmény és szállítás');
    expect(checkout).not.toContain('Tenant-specifikus');
    expect(catalog).toContain('<option value="professional">Viszonteladói</option>');
    expect(catalog).toContain('minimum rendelés');
  });

  test('platform operations pages translate raw machine states and expose load failures',()=>{
    const files=[
      'src/app/admin/kiadasok/page.tsx',
      'src/app/admin/rollout/page.tsx',
      'src/app/admin/utoellenorzes/page.tsx',
      'src/app/admin/helyreallitas/page.tsx',
      'src/app/admin/megfigyeles/page.tsx',
      'src/app/admin/muveletek/page.tsx',
      'src/app/admin/iranyitokozpont/page.tsx',
    ];
    for(const file of files){
      const source=read(file);
      expect(source).toContain('errorNotice');
      expect(source).toContain('adminStatePill');
    }
    const rollout=read('src/app/admin/rollout/page.tsx');
    expect(rollout).toContain('rolloutDecisionLabel');
    expect(rollout).toContain('environmentLabel');
    const operations=read('src/app/admin/muveletek/page.tsx');
    expect(operations).toContain('operationalStatusLabel');
    expect(operations).toContain('commerceStatusLabel');
    const monitoring=read('src/app/admin/megfigyeles/page.tsx');
    expect(monitoring).toContain("order('occurred_at',{ascending:false})");
  });

  test('shared operational display vocabulary keeps technical codes out of primary UI',()=>{
    const display=read('src/lib/admin/operational-display.ts');
    expect(display).toContain("go:'GO · Mehet'");
    expect(display).toContain("no_go:'NO-GO · Megállítva'");
    expect(display).toContain("rollback_recommended:'Visszaállítás javasolt'");
    expect(display).toContain("ready_to_pack:'Csomagolható'");
    expect(display).toContain("critical:'Kritikus'");
    expect(display).toContain('displayRecommendation');
  });
});
