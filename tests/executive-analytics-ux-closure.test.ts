import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('executive analytics UX closure',()=>{
  test('control tower is read-only for analytics-only users and surfaces query failures',()=>{
    const page=read('src/app/admin/iranyitokozpont/page.tsx');
    expect(page).toContain("hasStorePermission(store.instanceId,'store.manage')");
    expect(page).toContain('Csak olvasási jogosultság.');
    expect(page).toContain('error:qe');
    expect(page).toContain("canManage?<AlertActions");
    expect(page).toContain("canManage?<TaskActions");
  });

  test('growth refresh is hidden without marketing.manage',()=>{
    const page=read('src/app/admin/novekedes/page.tsx');
    expect(page).toContain("hasStorePermission(scope.instanceId,'marketing.manage')");
    expect(page).toContain('ügyfélutakat újratervezni');
    expect(page).toContain('Nyitott mentett kosarak');
  });

  test('executive analytics avoids unexplained AOV LTV cohort and winback labels',()=>{
    const page=read('src/app/admin/vezetoi/page.tsx');
    expect(page).toContain('Visszatérő vásárlók aránya');
    expect(page).toContain('Átlagos rendelési érték');
    expect(page).toContain('első vásárlási hónap');
    expect(page).not.toContain('Repeat rate');
    expect(page).not.toContain('Átlagos LTV');
    expect(page).not.toContain('Nyitott checkout recovery');
  });

  test('cashflow separates overdue supplier obligations from the next 30 days',()=>{
    const page=read('src/app/admin/cashflow/page.tsx');
    expect(page).toContain('const overdue=');
    expect(page).toContain(">=now&&+new Date(x.payment_due_at)<=now+30*DAY");
    expect(page).toContain('Működési előrejelzés, nem bankszámla-egyenleg');
    expect(page).toContain('<div><span>Lejárt</span>');
  });
});
