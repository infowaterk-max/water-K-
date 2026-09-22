import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('remaining admin false-zero closure',()=>{
  test('customer management withholds partner controls and KPIs when the customer model is partial',()=>{
    const page=read('src/app/admin/ugyfelek/page.tsx');
    expect(page).toContain('Hiányos lista mellett partnerjogosultságot nem módosítunk.');
    expect(page).toContain("loadError?'—':customers.length");
    expect(page).toContain('!loadError&&customers.map');
    expect(page).toContain("me?'—':formatHuf(totalRevenue)");
  });

  test('platform dashboard never claims there are zero webshops when the count query failed',()=>{
    const page=read('src/app/admin/platform/page.tsx');
    expect(page).toContain('pilotError||activeError||suspendedError');
    expect(page).toContain('!countError&&instanceCount===0');
    expect(page).toContain('webshop kiválasztása nélkül');
    expect(page).not.toContain('Első production tenant');
  });

  test('integration center shows unknown counts and blocks retries after partial read failure',()=>{
    const page=read('src/app/admin/integraciok/page.tsx');
    expect(page).toContain('Record<string,number|null>');
    expect(page).toContain("counts[key]??'—'");
    expect(page).toContain('disabled={loadError||job.status');
    expect(page).toContain('problemCount=counts.failed==null');
  });

  test('order list metrics do not become zero when the order query failed',()=>{
    const page=read('src/app/admin/rendelesek/page.tsx');
    expect(page).toContain("loadError?'—':orders.length");
    expect(page).toContain("loadError?'—':formatHuf(revenue)");
    expect(page).toContain("loadError?'—':attention");
  });

  test('settings page separates failed operational reads and disables manual integration control',()=>{
    const page=read('src/app/admin/beallitasok/page.tsx');
    expect(page).toContain('jobLoadError=false');
    expect(page).toContain('operationalRisk=dataLoadError?null');
    expect(page).toContain('disabled={dataLoadError||job.status');
    expect(page).toContain('Fizetési visszajelzés');
    expect(page).toContain('Integrációs feladatok');
  });
});
