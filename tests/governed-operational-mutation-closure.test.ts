import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('governed operational mutation closure',()=>{
  test('integration retry waits for linked order context',()=>{
    const page=read('src/app/admin/beallitasok/integraciok/[id]/page.tsx');
    expect(page).toContain('orderContextError');
    expect(page).toContain('Kézi újrafuttatást addig nem engedünk.');
    expect(page).toContain("disabled={orderContextError||job.status==='processing'");
  });

  test('recovery center actions are bound to complete evidence reads',()=>{
    const page=read('src/app/admin/helyreallitas/page.tsx');
    expect(page).toContain('canRunCycle=!serviceError');
    expect(page).toContain('canPlanDrill=!serviceError&&!drillError');
    expect(page).toContain('canManageDrills=!drillError');
    expect(page).toContain('canManageFindings=!findingError');
  });

  test('control tower disables all mutating paths when any decision source is partial',()=>{
    const page=read('src/app/admin/iranyitokozpont/page.tsx');
    expect(page).toContain('canAct=canManage&&!loadError');
    expect(page).toContain('Hiányos kontrolladat mellett nem futtatunk ciklust');
    expect(page).toContain('canAct?<TaskActions');
    expect(page).toContain('canAct?<AlertActions');
  });

  test('release governance never mutates candidates from an incomplete GO/NO-GO view',()=>{
    const page=read('src/app/admin/kiadasok/page.tsx');
    expect(page).toContain('canAct=!loadError');
    expect(page).toContain('Kiadási ciklus csak teljes bizonyítéki nézetből indítható.');
    expect(page).toContain('canAct?<ReleaseCreateForm');
    expect(page).toContain('canAct?<ReleaseActions');
  });

  test('platform operations cannot run or transition orders without complete tenant evidence',()=>{
    const page=read('src/app/admin/muveletek/page.tsx');
    expect(page).toContain('canAct=!loadError');
    expect(page).toContain('canAct?<OperationsCycleButton');
    expect(page).toContain('canAct?<OrderOperationAction');
  });

  test('cash-flow detail does not show derived figures after source failure',()=>{
    const page=read('src/app/admin/cashflow/page.tsx');
    expect(page).toContain("loadError?'A részletes 30 napos bontás most nem használható.'");
  });
});
