import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Beauty Lab retired canonical source history',()=>{
  it('does not expose Beauty Lab as an active or installable catalog authority',()=>{
    expect(getStorefrontTemplatePackage('beauty.beauty-lab')).toBeUndefined();
    const catalog=read('src/lib/builder/storefront-template-catalog.ts');
    expect(catalog).not.toContain("from '@/lib/builder/templates/beauty-lab-canonical-v2'");
    expect(catalog).not.toContain("from '@/lib/builder/templates/beauty-lab-reference-v2'");
  });

  it('preserves historical Beauty Lab v2 source for later approved-reference inventory instead of deleting evidence early',()=>{
    const canonical=read('src/lib/builder/templates/beauty-lab-canonical-v2.ts');
    const reference=read('src/lib/builder/templates/beauty-lab-reference-v2.ts');
    expect(canonical).toContain('beauty.beauty-lab');
    expect(reference).toContain('beauty.beauty-lab');
  });

  it('keeps the generic Builder upgrade confirmation capability for future canonical template versions',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    expect(page).toContain('currentTemplateVersion={document?.templateVersion??null}');
    expect(library).toContain('Sablon frissítése');
    expect(library).toContain('SABLONFRISSÍTÉS');
    expect(library).toContain('A publikált storefront érintetlen marad');
    expect(library).toContain('A jelenlegi draft oldalak szerkesztéseit a ');
    expect(library).toContain('sablonfrissítés');
    expect(library).toContain('felülírhatja');
    expect(library).toContain('template.templateVersion>currentTemplateVersion');
  });
});
