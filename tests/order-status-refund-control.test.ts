import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('order status and refund acceptance contract',()=>{
  test('merchant status selector mirrors the direct order transition API',()=>{
    const control=read('src/components/admin/order-status-control.tsx');
    const api=read('src/app/api/admin/orders/[id]/route.ts');

    expect(control).toContain("paid:['processing'],processing:['shipped'],shipped:['completed'],completed:[],cancelled:[],refunded:[]");
    expect(control).not.toContain("paid:['processing','refunded','cancelled']");
    expect(control).not.toContain("processing:['shipped','refunded','cancelled']");
    expect(api).toContain("paid:['processing']");
    expect(api).toContain("processing:['shipped']");
    expect(api).toContain("shipped:['completed']");
  });

  test('refund remains a dedicated return/payment workflow rather than a direct status edit',()=>{
    const api=read('src/app/api/admin/orders/[id]/route.ts');
    const returns=read('src/components/admin/return-case-actions.tsx');

    expect(api).toContain('Visszatérítést csak a fizetési/visszáru folyamaton keresztül lehet rögzíteni.');
    expect(returns).toContain("update('refund_pending')");
    expect(returns).toContain("update('refunded')");
    expect(returns).toContain('tényleges banki vagy pénzügyi visszatérítés után');
  });
});
