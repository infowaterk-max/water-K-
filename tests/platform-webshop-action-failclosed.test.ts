import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform webshop action fail-closed behavior',()=>{
  test('platform configuration writes do not swallow database failures',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(source).toContain('platformWriteFailed');
    expect(source).toContain("platformWriteFailed('plan/status update',error)");
    expect(source).toContain("platformWriteFailed('branding update',error)");
    expect(source).toContain("platformWriteFailed('storefront update',error)");
    expect(source).toContain("platformWriteFailed('addon update',error)");
    expect(source).toContain('Az állapotot nem tekintjük módosítottnak.');
  });

  test('addon changes fail closed when their prerequisite plan read fails',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(source).toContain("platformWriteFailed('addon prerequisite read',instanceError)");
    expect(source).toContain('ADDONS[addon].compatiblePlans.includes(instance.subscription_plan)');
  });

  test('owner invite does not create a new invitation after an ambiguous profile lookup',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    const readIndex=source.indexOf('existingError');
    const guardIndex=source.indexOf("if(existingError)redirect('/admin/platform/webaruhazak?invite=error')");
    const inviteIndex=source.indexOf('inviteUserByEmail');
    expect(readIndex).toBeGreaterThan(0);
    expect(guardIndex).toBeGreaterThan(readIndex);
    expect(inviteIndex).toBeGreaterThan(guardIndex);
  });
});
