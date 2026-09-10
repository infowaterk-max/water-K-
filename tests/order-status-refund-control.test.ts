import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('order status and refund acceptance contract',()=>{
  test('merchant status selector and direct order transition API share the canonical transition authority',()=>{
    const control=read('src/components/admin/order-status-control.tsx');
    const api=read('src/app/api/admin/orders/[id]/route.ts');
    const contract=read('src/lib/orders/orchestration-contract.ts');

    expect(control).toContain("adminOrderNextStatuses}from'@/lib/orders/orchestration-contract'");
    expect(control).toContain('const allowed=adminOrderNextStatuses(status)');
    expect(control).not.toContain('const allowed:Record<string,string[]>');
    expect(api).toContain("ADMIN_ORDER_TRANSITIONS,");
    expect(api).toContain('canAdminTransitionOrder(currentStatus,nextStatus)');
    expect(api).not.toContain('const allowed:Record<');
    expect(contract).toContain("paid:['processing']");
    expect(contract).toContain("processing:['shipped']");
    expect(contract).toContain("shipped:['completed']");
    expect(contract).toContain("if(!(ADMIN_ORDER_MUTATION_STATUSES as readonly string[]).includes(status))return[]");
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
