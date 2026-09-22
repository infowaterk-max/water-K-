import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Email template library native mobile rendering',()=>{
  it('renders both desktop table and mobile card representations from the same tenant templates',()=>{
    const page=read('src/app/admin/email-sablonok/page.tsx');
    expect(page).toContain("import './email-template-library.css';");
    expect(page).toContain('savedTemplateTable');
    expect(page).toContain('savedTemplateCards');
    expect(page).toContain('savedTemplateCard');
    expect(page).toContain('<dt>Család</dt>');
    expect(page).toContain('<dt>Aktív verzió</dt>');
    expect(page).toContain('savedTemplateActions');
  });

  it('replaces the table with cards only on native mobile widths',()=>{
    const css=read('src/app/admin/email-sablonok/email-template-library.css');
    expect(css).toContain('.savedTemplateCards{display:none}');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('.emailTemplatesPage .savedTemplateTable{display:none}');
    expect(css).toContain('.emailTemplatesPage .savedTemplateCards{display:grid');
    expect(css).toContain('overflow-wrap:anywhere');
    expect(css).toContain('.emailTemplatesPage .savedTemplateActions');
  });

  it('keeps editor publication actions intact on mobile cards',()=>{
    const page=read('src/app/admin/email-sablonok/page.tsx');
    for(const label of['Szerkesztés','Előnézet','Verziók és aktiválás'])expect(page).toContain(label);
    expect(page).toContain('actions(item.id)');
  });
});
