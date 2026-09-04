import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('post-release PR42 UX reconciliation',()=>{
  test('customer order vocabulary covers payment-wait states and enabled providers',()=>{
    const display=read('src/lib/order-display.ts');
    for(const token of ["pending_payment:'Fizetésre vár'","pending_transfer:'Átutalásra vár'","stripe:'Stripe bankkártya'","simplepay:'SimplePay bankkártya'","barion:'Barion bankkártya'","packeta:'Packeta'","dpd:'DPD'","expressone:'Express One'"])expect(display).toContain(token);
  });
  test('admin order list uses shared labels and remains tenant-scoped',()=>{
    const page=read('src/app/admin/rendelesek/page.tsx');
    expect(page).toContain("requireCurrentStoreContext('orders.manage')");
    expect(page).toContain("eq('instance_id',scope.instanceId)");
    expect(page).toContain('orderStatusLabel(o.status)');
    expect(page).toContain('paymentMethodLabel(o.payment_method)');
    expect(page).toContain('shippingMethodLabel(o.shipping_method)');
  });
  test('platform views preserve fail-closed notices while humanizing machine states',()=>{
    for(const file of ['src/app/admin/rollout/page.tsx','src/app/admin/megfigyeles/page.tsx','src/app/admin/muveletek/page.tsx','src/app/admin/iranyitokozpont/page.tsx']){
      const source=read(file);
      expect(source).toContain('errorNotice');
      expect(source).toContain('adminStatePill');
    }
    expect(read('src/app/admin/rollout/page.tsx')).toContain('rolloutDecisionLabel');
    expect(read('src/app/admin/iranyitokozpont/page.tsx')).toContain('displayRecommendation');
    expect(read('src/app/admin/muveletek/page.tsx')).toContain('operationalStatusLabel');
  });
  test('storefront copy uses reseller terminology and explicit net/minimum labels',()=>{
    const source=read('src/components/catalog/shop-catalog.tsx');
    expect(source).toContain('<option value="professional">Viszonteladói</option>');
    expect(source).toContain('Nettó ár:');
    expect(source).toContain('minimum rendelés');
    const product=read('src/app/termek/[slug]/page.tsx');
    expect(product).toContain("?'viszonteladói':'lakossági'");
    expect(product).toContain('Ezt a viszonteladói terméket');
  });
});
