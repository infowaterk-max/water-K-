import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('campaign and communication UX closure',()=>{
  test('campaign detail does not overstate profit when cost snapshots are incomplete',()=>{
    const page=read('src/app/admin/kampanyok/[id]/page.tsx');
    expect(page).toContain('completeProfitData');
    expect(page).toContain('unit_cost_net_huf_snapshot!=null');
    expect(page).toContain('line_total_net_huf_snapshot!=null');
    expect(page).toContain('Teljes önköltségadat szükséges.');
    expect(page).toContain('Bevétel / költés');
    expect(page).toContain('Kampányhoz köthető rendelések');
  });

  test('campaign detail and customer email workspace surface partial query failures instead of false zeros',()=>{
    const campaign=read('src/app/admin/kampanyok/[id]/page.tsx');
    const office=read('src/app/admin/kommunikacio/iroda/page.tsx');
    expect(campaign).toContain('recipientError||conversionError||eventError');
    expect(campaign).toContain('orderError||itemError');
    expect(office).toContain('const loadError=Boolean(threadResult.error||taskResult.error||orderResult.error||jobResult.error||bindingResult.error||draftResult.error||mailboxResult.error||messageResult.error||routeResult.error||profileResult.error)');
    expect(office).toContain('Hiányos adatok mellett módosítást nem tekintünk biztonságosan végrehajthatónak.');
  });

  test('integration detail keeps raw provider payload out of the primary view',()=>{
    const page=read('src/app/admin/beallitasok/integraciok/[id]/page.tsx');
    expect(page).toContain('Technikai adatok megnyitása');
    expect(page).toContain('Fizetési visszajelzés');
    expect(page).toContain('auditJson');
  });
});