import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform audit and control-center UX',()=>{
  test('platform dashboard uses real global counts instead of the limited recent list',()=>{
    const page=read('src/app/admin/platform/page.tsx');
    expect(page).toContain("select('id',{count:'exact',head:true})");
    expect(page).toContain(".limit(12)");
    expect(page).toContain("{instanceCount??'—'}");
    expect(page).not.toContain('<div className="price">{rows.length}</div>');
    expect(page).toContain('A lenti lista csak a legutóbbi 12 példányt mutatja');
  });

  test('assurance page explains controls, findings and evidence in user language',()=>{
    const page=read('src/app/admin/biztositekok/page.tsx');
    const actions=read('src/components/admin/assurance-actions.tsx');
    expect(page).toContain('Mit jelent ez az oldal?');
    expect(page).toContain('Kontroll');
    expect(page).toContain('Eltérés');
    expect(page).toContain('Bizonyíték');
    expect(page).toContain("critical:'Kritikus'");
    expect(page).toContain("accepted_risk:'Elfogadott kockázat'");
    expect(actions).toContain('Ellenőrzés futtatása');
  });

  test('action center exposes the guarded lifecycle instead of raw technical statuses',()=>{
    const page=read('src/app/admin/intezkedesek/page.tsx');
    expect(page).toContain('Javaslat → szimuláció → jóváhagyás → végrehajtás');
    expect(page).toContain("proposed:'Javaslat'");
    expect(page).toContain("approved:'Jóváhagyott'");
    expect(page).toContain('A platformnézet szándékosan csak olvasható');
  });

  test('platform audit log shows tenant and actor context while keeping raw JSON collapsed',()=>{
    const page=read('src/app/admin/naplo/page.tsx');
    expect(page).toContain('Platform műveleti napló');
    expect(page).toContain('organization_id,instance_id');
    expect(page).toContain("from('profiles')");
    expect(page).toContain("from('webshop_instances')");
    expect(page).toContain('<th scope="col">Webshop</th>');
    expect(page).toContain('Változás megnyitása');
    expect(page).toContain('auditJson');
  });

  test('audit remediation stylesheet supports explanation cards and state pills',()=>{
    const css=read('src/app/admin/admin-audit-remediation.css');
    expect(css).toContain('.auditGuide{');
    expect(css).toContain('.auditGuideGrid{');
    expect(css).toContain('.adminStatePill.ok');
    expect(css).toContain('.adminStatePill.danger');
  });
});
