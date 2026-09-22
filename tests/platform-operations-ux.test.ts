import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform operations UX',()=>{
  test('global operations rows identify the webshop for orders and variants',()=>{
    const page=read('src/app/admin/muveletek/page.tsx');
    expect(page).toContain("from('orders').select('id,instance_id')");
    expect(page).toContain("from('product_variants').select('id,instance_id')");
    expect(page).toContain("from('webshop_instances').select('id,name,slug')");
    expect(page).toContain('<th>Webshop</th>');
    expect(page).toContain('storeName(tenantByOrder.get(r.order_id))');
    expect(page).toContain('storeName(tenantByVariant.get(v.variant_id))');
  });

  test('operations page surfaces query failures and uses shared translated statuses',()=>{
    const page=read('src/app/admin/muveletek/page.tsx');
    const operational=read('src/lib/admin/operational-display.ts');
    const orders=read('src/lib/order-display.ts');
    expect(page).toContain('queueError||summaryError||kpiError||stockError');
    expect(page).toContain('operationalStatusLabel(r.operational_status)');
    expect(page).toContain("insufficient_stock:'Nincs elegendő készlet'");
    expect(operational).toContain("ready_to_pack:'Csomagolható'");
    expect(orders).toContain("pending_payment:'Fizetésre vár'");
  });
});
