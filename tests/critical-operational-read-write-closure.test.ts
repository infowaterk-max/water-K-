import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('critical operational read-to-write closure',()=>{
  test('order list and order detail block mutations when the operational read is incomplete',()=>{
    const list=read('src/app/admin/rendelesek/page.tsx');
    const detail=read('src/app/admin/rendelesek/[id]/page.tsx');
    expect(list).toContain("!loadError?<OrderStatusControl");
    expect(detail).toContain('detailLoadError=Boolean(itemError||eventError||jobError||attemptError)');
    expect(detail).toContain('canAct=!detailLoadError');
    expect(detail).toContain('Kézi teljesítés átmenetileg letiltva.');
    expect(detail).toContain('&&canAct&&<IntegrationJobRetry');
  });

  test('growth refresh cannot mutate journeys from a partial decision view',()=>{
    const page=read('src/app/admin/novekedes/page.tsx');
    expect(page).toContain('canAct=canRefresh&&!loadError');
    expect(page).toContain('Hiányos döntési adatok mellett nem indítunk új ügyfélút- vagy kiküldési feldolgozást.');
  });

  test('assurance read failures do not become zero/green evidence and finding actions fail closed',()=>{
    const page=read('src/app/admin/biztositekok/page.tsx');
    expect(page).toContain("readinessResult.error?'—'");
    expect(page).toContain('canManageFindings=!findingResult.error');
    expect(page).toContain("findingResult.error?'—'");
    expect(page).toContain('canManageFindings?<AssuranceFindingActions');
    expect(page).toContain('!controlResult.error&&controls.length===0');
    expect(page).toContain('!runResult.error&&!history.length');
  });
});
