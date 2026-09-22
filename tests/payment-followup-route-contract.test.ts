import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('payment follow-up route contract',()=>{
  test('transactional payment follow-up matches the actual pending_payment work queue',()=>{
    const route=read('src/app/api/admin/communication/enqueue/route.ts');
    const page=read('src/app/admin/utanakovetes/page.tsx');
    expect(page).toContain("o.status==='pending_payment'");
    expect(route).toContain("o.status!=='pending_payment'");
    expect(route).not.toContain("o.status!=='pending'||");
    expect(route).toContain("getAdminRequestUser(permission)");
    expect(route).toContain("requireCurrentStoreContext(permission)");
  });
});
